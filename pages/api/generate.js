import fs from 'fs';
import path from 'path';
import OpenAI from "openai";

const openai = new OpenAI();

const readChatHistory = () => {
  try {
    const data = fs.readFileSync(path.join(process.cwd(), 'public', 'history.txt'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read chat history:", error);
    return [{ role: "system", content: "You are a helpful assistant." }];
  }
};

const writeChatHistory = (chatHistory) => {
  try {
    fs.writeFileSync(path.join(process.cwd(), 'public', 'history.txt'), JSON.stringify(chatHistory, null, 2), 'utf8');
  } catch (error) {
    console.error("Failed to write chat history:", error);
  }
};

export default async function handler(req, res) {
  const { method } = req;
  let chatHistory = readChatHistory();

  const initial = [
    {
      "role": "system",
      "content": "You are a writer for a role-playing game. You will write a scenario for the player, set in a medieval fantasy world. Begin with a very short description of the player, afterwards, make up a short scene involving the player. You are talking to the player. Be extremely brief."
    }
  ]

  switch (method) {
    case "POST":
      if (req.query.endpoint === "chat") {
        const content = req.body.message;
        chatHistory.push({ role: "user", content: content });
        writeChatHistory(chatHistory);
        res.status(200).json({ success: true });
      } else if (req.query.endpoint === "reset") {
        writeChatHistory(initial);
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ error: "Not Found" });
      }
      break;
      case "GET":
        if (req.query.endpoint === "history") {
          res.status(200).json(chatHistory);
        } else if (req.query.endpoint === "stream") {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
      
          let assistantResponse = { role: "assistant", content: "" };
      
          try {
            const stream = await openai.beta.chat.completions.stream({
              model: "gpt-3.5-turbo",
              messages: chatHistory,
              stream: true,
            });
      
            for await (const chunk of stream) {
              const message = chunk.choices[0]?.delta?.content || "";
              assistantResponse.content += message;
              
              res.write(`data: ${JSON.stringify(message)}\n\n`);
            }
      
            if (assistantResponse.content) {
              chatHistory.push(assistantResponse);
              writeChatHistory(chatHistory);
              res.write(`event: done\ndata: ${assistantResponse.content}\n\n`);
            }
      
          } catch (error) {
            res.write(
              "event: error\ndata: " +
                JSON.stringify({ message: "Stream encountered an error" }) +
                "\n\n"
            );
          }

          return new Promise((resolve) => {
            req.on("close", () => {
              resolve();
            });
          });
        } else {
          res.status(404).json({ error: "Not Found" });
        }
        break;
      
      
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
