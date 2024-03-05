const axios = require('axios');
const fs = require('fs');
const path = require('path');


export default async function (req, res) {

  const negativePrompts = '(low quality, worst quality:1.4), cgi,  text, signature, watermark, extra limbs'

  let intervalId = {}
  try {
      let requestBody = {
        "prompt": req.body.prompt,
        "negative_prompt": negativePrompts,
        "seed": -1,
        "steps": 8,
        "cfg_scale": 2,
        "width": 1024,
        "height": 1024,
        "batch_size": 1,
        "sampler_index": "DPM++ SDE Karras",
        "override_settings": {
          "CLIP_stop_at_last_layers": 2
          }
      };

      intervalId = setInterval(saveProgress, 500);

      let response = await axios.post('http://127.0.0.1:7860/sdapi/v1/txt2img', requestBody);
      console.log(response.status)


      clearInterval(intervalId);
      

    if (response.status === 200) {

        let imageRes = response.data.images[0]

        saveBase64ImageToFile("public/current.png", imageRes)
        
        res.status(200).json({
          image: imageRes,
          message: "done"
        });
    } else {
      res.status(response.status).json({
        error: {
          message: 'An error occurred during the request.',
        }
      });
    }
  } catch (error) {
    res.status(200).json({
      image: "",
      msg: error.message
    });
  }

  function saveBase64ImageToFile(filePath, base64Data) {
    const buffer = Buffer.from(base64Data, 'base64');
  
    fs.writeFile(filePath, buffer, (error) => {
      if (error) {
        console.error('Error while saving the image:', error);
      } else {
        console.log('Image saved successfully.');
      }
    });
  }



  async function saveProgress() {
    try {
        const response = await axios.get('http://127.0.0.1:7860/sdapi/v1/progress')
        if (response.status === 200 && response.data.current_image) {
          saveBase64ImageToFile("public/current.png", response.data.current_image)
        }
    } catch (error) {
        console.error('Error saving the image:', error);
    }
}
}
