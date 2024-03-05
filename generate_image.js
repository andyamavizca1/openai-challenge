import axios from 'axios';
import { compressImageToJpg } from './utilities/imageCompression';
import { compressImageToPng } from './utilities/imageCompressionPNG';
import fs from 'fs';
import path from 'path';

export default async function (req, res) {
  
  const json = ParseJSON(req.body)
  
  const negativePrompts = 'lowres, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, (worst quality, low quality), jpeg artifacts, (signature:1.1), (watermark:1.1), username, blurry, monochrome, motion lines, speech bubble, (elf ears, artist name:1.1), (hat, hair accessory, thighhighs)'
  let response = null

  try {


    let loras = ''
    
    for(let i = 0; i < 10; i ++) {
      let val = parseFloat(Object.values(json.loras)[i])
      let lora = Object.keys(json.loras)[i]
      val = Math.floor(val * 100) / 100
      if(lora && val != 0) {
        loras += ` <lora:${lora}:${val}>`
      }
    }
    
    for(let i = 0; i < 10; i ++) {
      let val = parseFloat(Object.values(json.loras2)[i])
      let lora = Object.keys(json.loras2)[i]
      val = Math.floor(val * 100) / 100
      if(lora && val != 0) {
        loras += ` <lora:${lora}:${val}>`
      }
    }
    

    if(!json.redo) {

      
      const base64imageSaved = readImageSaved(json, false)
      const base64imageSavedFront = readImageSaved(json, true)
     
      const base64imageBase = readImageBase(json)



      let requestBody = {
        "model": `loli_richy.safetensors [48b74e7176]`,
        "prompt": (json.prompt || 'sky') + loras,
        "negative_prompt": negativePrompts + (json.negative_prompt ? (', ' + json.negative_prompt) : ''),
        "seed": json.seed || -1,
        "steps": json.steps || 30,
        "cfg_scale": 10,
        "width": 512,
        "height": 768,
        "restore_faces": false,
        "batch_size": 1,
        "sampler_index": "Euler a",//DPM++ 2M Karras, DPM++ 2S a
        "override_settings": {
          "CLIP_stop_at_last_layers": 2
          }
      };
  
      //intervalId = setInterval(saveProgress, 500);
  
      if(json.action == 0) {

        let arrImgs = []

        if(base64imageSaved) {
          arrImgs = [
            {
              "enabled": true,
              "input_image":base64imageBase,
              "module": "canny",
              "model":"control_v11p_sd15_canny [d14c016b]",
              "weight": 0.35,
              "processor_res": 512,
              "guidance_start": 0.0,
              "guidance_end": 0.1,
              "control_mode": 0,
              "resize_mode":1,
              "threshold_a":100,
              "threshold_b": 200,
          },
            {
            
              "enabled": true,
              "input_image":base64imageSaved,
              "module": "canny",
              "model":"control_v11p_sd15_canny [d14c016b]",
              "weight": 0.35,
              "processor_res": 512,
              "guidance_start": 0,
              "guidance_end": 0.15,
              "control_mode": 1,
              "resize_mode":1,
              "threshold_a":100,
              "threshold_b": 200,
          
          }]

          if(json.back && base64imageSavedFront) {
            arrImgs.push({
            
              "enabled": true,
              "input_image":base64imageSavedFront,
              "module": "canny",
              "model":"control_v11p_sd15_canny [d14c016b]",
              "weight": 0.25,
              "processor_res": 512,
              "guidance_start": 0,
              "guidance_end": 0.05,
              "control_mode": 1,
              "resize_mode":1,
              "threshold_a":100,
              "threshold_b": 200,
          
          })
          }
        } else {
          arrImgs = [{
            "enabled": true,
            "input_image":base64imageBase,
            "module": "canny",
            "model":"control_v11p_sd15_canny [d14c016b]",
            "weight": 0.35,
            "processor_res": 512,
            "guidance_start": 0.0,
            "guidance_end": 0.1,
            "control_mode": 1,
            "resize_mode":1,
            "threshold_a":100,
            "threshold_b": 200,
        }]

        if(json.back && base64imageSavedFront) {
          arrImgs.push({
            
            "enabled": true,
            "input_image":base64imageSavedFront,
            "module": "canny",
            "model":"control_v11p_sd15_canny [d14c016b]",
            "weight": 0.25,
            "processor_res": 512,
            "guidance_start": 0,
            "guidance_end": 0.05,
            "control_mode": 1,
            "resize_mode":1,
            "threshold_a":100,
            "threshold_b": 200,
        
        })
        }
        }

        console.log(arrImgs)


        requestBody = {
          ...requestBody,
          "alwayson_scripts":{
            "controlnet":{
                "args": arrImgs
            }
          }
        }
        
        response = await axios.post('http://127.0.0.1:7860/sdapi/v1/interrupt', {});
      }
  
      response = await axios.post('http://127.0.0.1:7860/sdapi/v1/txt2img', requestBody);
    } else {
      console.log("redoing image")

      const imagePath = `public/uploads/${json.charId}-${json.action}.png`; // Adjust the path to your image

      const base64image = readImage(imagePath)
    
      if(!base64image) {
        res.status(500).json({
          error: {
            message: 'An error occurred during your request. Image was not able to be read',
          }
        });
      } else {
        const requestBody = {
          "init_images": [base64image],
          "prompt": (json.prompt || 'sky') + loras,
          "negative_prompt": negativePrompts + (json.negative_prompt ? (', ' + json.negative_prompt) : ''),
          "seed": json.seed || -1,
          "steps": json.steps || 30,
          "cfg_scale": 7,
          "width": 512,
          "height": 768,
          "restore_faces": false,
          "denoising_strength": 0.7,
          "batch_size": 1,
          "sampler_index": "DPM++ 2S a",
          "override_settings": {
            "CLIP_stop_at_last_layers": 2
            }
        };
    
        //intervalId = setInterval(saveProgress, 500);
    
        if(json.action == 0) {
          response = await axios.post('http://127.0.0.1:7860/sdapi/v1/interrupt', {});
        }
    
        response = await axios.post('http://127.0.0.1:7860/sdapi/v1/img2img', requestBody);

      }
    }


    //clearInterval(intervalId);

    if (response.status === 200) {
      // You can handle the response data here
        console.log("processing...")

        let imageRes = response.data.images[0]
        if(json.rembg) {
          imageRes = await CheckBackground(imageRes);
        } 
        
        imageRes = await compressImageToPng(imageRes);
        
        if(json.attachment) {
          const filePath = path.join(process.cwd(), `public/uploads/attachments/${json.attachment}.png`);
          saveBase64ImageToFile(filePath, imageRes)
        } else {
          if(json.action == 0) {
            const sideString = json.back ? 'back.png' : 'front.png'

            const filePath = path.join(process.cwd(), `public/uploads/chars/${json.charId}-${sideString}`);
            saveBase64ImageToFile(filePath, imageRes)
          } else {
            const filePath = path.join(process.cwd(), `public/uploads/actions/${json.charId}-${json.action}.png`);
            saveBase64ImageToFile(filePath, imageRes)
          }

        }

        res.status(200).json({
          image: imageRes
        });
    } else {
       console.log("error mep")
      // Handle other HTTP status codes as needed
      res.status(response.status).json({
        error: {
          message: 'An error occurred during the request.',
        }
      });
    }
  } catch (error) {
    res.status(200).json({
      image: "",
      msg: "webui not started"
    });
  }

  function ParseJSON(requestBody) {
    let json = requestBody
    try {
      json = JSON.parse(Object.keys(requestBody)[0]);
    } catch (error) {
      json = requestBody;
    } 

    return json
  }

    function saveBase64ImageToFile(filePath, base64Data) {
      // Convert the Base64 data to a buffer
      const buffer = Buffer.from(base64Data, 'base64');
    
      // Write the buffer to a file using the callback-based version
      fs.writeFile(filePath, buffer, (error) => {
        if (error) {
          console.error('Error while saving the image:', error);
        } else {
          console.log('Image saved successfully.');
        }
      });
    }

    function readImageSaved(json, force) {
 
      let sideString = json.back ? 'back.png' : 'front.png'

      if(force)sideString = 'front.png'
      
      let imagePath = `public/uploads/chars/${json.charId}-${sideString}`; // Primary path
      // Check if the file exists in the primary path

      if (!fs.existsSync(imagePath)) {
        return null
      }

      try {
        // Read the image file as a buffer
        const imageBuffer = fs.readFileSync(imagePath);
    
        // Convert the image buffer to a base64-encoded string
        const base64Image = imageBuffer.toString('base64');
    
        return base64Image;
      } catch (error) {
        console.error('Error reading the image:', error);
        return null;
      }
    }



    function readImageBase(json) {
      const imagePath =  `public/uploads/refs_vol/${getRef(json.age, json.back)}`; // Primary path
      if (!fs.existsSync(imagePath)) {
        return null
      }

      try {
        // Read the image file as a buffer
        const imageBuffer = fs.readFileSync(imagePath);
    
        // Convert the image buffer to a base64-encoded string
        const base64Image = imageBuffer.toString('base64');
    
        return base64Image;
      } catch (error) {
        console.error('Error reading the image:', error);
        return null;
      }
    }
    
    function refExists(json) {
      const sideString = json.back ? 'back.png' : 'front.png'
      let imagePath = `public/uploads/chars/${json.charId}-${sideString}`; // Primary path
      return fs.existsSync(imagePath)
    
    }

    function getRef(age, back) {
      if(back) {
        if(age >= 25) {
          return "30_back.png"
        } else if(age >= 18) {
          return "20_back.png"
        } else if(age >= 16) {
          return "16_back.png"
        } else if(age >= 14) {
          return "14_back.png"
        } else if(age >= 12) {
          return "12_back.png"
        } else {
          return "10_back.png"
        }
      } else {
        if(age >= 25) {
          return "30_front.png"
        } else if(age >= 18) {
          return "20_front.png"
        } else if(age >= 16) {
          return "16_front.png"
        } else if(age >= 14) {
          return "14_front.png"
        } else if(age >= 12) {
          return "12_front.png"
        } else {
          return "10_front.png"
        }
      }
    }


    

    async function CheckBackground(image) {

      const requestBody = {
        "input_image": image,
        "model": "isnet-anime",
        "return_mask": false,
        "alpha_matting": false,
        "alpha_matting_foreground_threshold": 240,
        "alpha_matting_background_threshold": 10,
        "alpha_matting_erode_size": 10
      }

      const response = await axios.post('http://127.0.0.1:7860/rembg', requestBody);
      if (response.status === 200) {
        return response.data.image
      } else {
        return response.data.detail[0].msg
      }
    }

    async function saveProgress() {
        const response = await axios.get('http://127.0.0.1:7860/sdapi/v1/progress');
        if (response.status === 200) {
            //got progress image
            //console.log("progress: " + response.data)
        }
    };
}
