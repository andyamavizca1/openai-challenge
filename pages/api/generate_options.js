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
      "content": "You are a helpful assistant. You are a game master. You generate the options a player is able to take after a scene. Only include the options, numbered from 1 to 3."
    },
    {
      "role": "user",
      "content": "You are a skilled archer named Liriel, known for your precision and steady hand. As you journey through a dense forest, you come across a group of bandits ambushing a merchant caravan. The bandits outnumber the merchants, and it's up to you to decide whether to intervene and potentially reveal your presence or stay hidden and observe the situation. What do you do, Liriel?"
    },
    {
      "role": "assistant",
      "content": "1. Stay hidden.\n2. Help the merchant caravan.\n3. Help the bandits attack the merchant caravan."
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
    res.status(500).json({ error: 'Failed to generate context from OpenAI.' });
  }
}

const getContext = () => {
  try {
    const data = fs.readFileSync(path.join(process.cwd(), 'public', 'history.txt'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
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

    let lastParagraph = paragraphs.slice(-1);
    return lastParagraph.join("\n\n");
}