import OpenAI from "openai";
import fs from 'fs';
import path from 'path';
const openai = new OpenAI();


export default async function handler(req, res) {
  const { method, body } = req;

  if (method !== 'POST') {
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const context = extractAssistantContent(getContext())

  const initial = [
    {
      "role": "system",
      "content": "You are a helpful assistant. You describe scenes. In a description, you only describe the landscapes, and the protagonist. When you describe a protagonist, you do it like this: woman, standing, blue eyes, white hair, black dress."
    },
    {
      "role": "user",
      "content": "You are Kaelan, a skilled elven archer known for your accuracy and quick reflexes. As you traverse the dense forest on a mission to retrieve an ancient artifact, you come across a group of bandits blocking your path. Ready your bow and brace yourself for battle."
    },
    {
      "role": "assistant",
      "content": "A tall, male elf with brown hair and green eyes, he is in a dense forest, getting ready for combat with his bow."
    },
    {
      "role": "user",
      "content": context
    }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: initial,
      stream: false,
    });

    res.status(200).json({ message: completion.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI error:', error);
    res.status(500).json({ error: 'Failed to generate context from OpenAI.' });
  }
}

const getContext = () => {
  try {
    const data = fs.readFileSync(path.join(process.cwd(), 'public', 'history.txt'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read chat history:", error);
    return [{ role: "system", content: "You are a helpful assistant." }];
  }
};

function extractAssistantContent(jsonData) {
    let paragraphs = [];

    jsonData.forEach(item => {

        if (item.role === "assistant") {
            paragraphs.push(...item.content.split(/\n\n|\r\n\r\n/));
        }
    });

    let last3Paragraphs = paragraphs.slice(-3);

    return last3Paragraphs.join("\n\n");
}