import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import styles from "./index.module.css";

let intervalId = {}

export default function Home() {
  const [imageVersion, setImageVersion] = useState('');
  const [options, setOptions] = useState([]);

  useEffect(() => {
    setup()
    setImageVersion(`?ver=${Date.now()}`);
  }, []);

  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "system", content: "You are a helpful assistant." },
  ]);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const sendMessage = async (message) => {
    setChatHistory((prev) => [...prev, { role: "user", content: message }]);

    const response = await fetch("/api/generate?endpoint=chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    if (data.success) {
      const eventSource = new EventSource("/api/generate?endpoint=stream");
      eventSource.onmessage = function (event) {
        const parsedData = JSON.parse(event.data);
        setChatHistory((prevChatHistory) => {
          const newChatHistory = [...prevChatHistory];
          if (
            newChatHistory.length > 0 &&
            newChatHistory[newChatHistory.length - 1].role === "assistant"
          ) {
            newChatHistory[newChatHistory.length - 1].content += parsedData;
          } else {
            newChatHistory.push({ role: "assistant", content: parsedData });
          }
          return newChatHistory;
        });
      };

      eventSource.addEventListener('done', function(event) {
        generateImage()
        generateOptions()
        eventSource.close();
      })

      eventSource.onerror = function () {
        eventSource.close();
      };
    }
  };

    const fetchChatHistory = async () => {
      const response = await fetch("/api/generate?endpoint=history");
      const history = await response.json();
      if (response.ok) {
        setChatHistory(history);
      } else {
        console.error("Failed to load chat history.");
      }
    };

  const setup = async () => {
    setOptions([])
    clearInterval(intervalId);
    await deleteImage()
    await clearChat()
    await sendMessage("")
  }
  
  const deleteImage = async () => {
    const response = await fetch('/api/delete_image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  
    if (response.ok) {
      updateImageVersion()
      console.log('Image deleted successfully');
    } else {
      console.error('Failed to delete the image');
    }
  };

  const generateOptions = async () => {
    const context = await fetch("/api/generate_options", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatHistory),
    });

    const contextResponse = await context.json();
    const finalContext = contextResponse.message
    console.log(finalContext)

    const items = finalContext.split('\n');

    const optionsArray = items.map(item => {
      const splitItem = item.indexOf('. ') >= 0 ? item.split('. ')[1] : item;
      return splitItem.trim();
    });

    console.log(optionsArray);
    setOptions(optionsArray)
  };

  const onSelectOption = async (option) => {
    console.log(option);
    sendMessage(option);
    setOptions([])
  };
  
  const generateImage = async () => {
    const context = await fetch("/api/generate_context", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatHistory),
    });

    const contextResponse = await context.json();
    const finalContext = contextResponse.message
    console.log(finalContext)

    intervalId = setInterval(updateImageVersion, 1000);
    const response = await fetch("/api/generate_image", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalContext
      }) 
    });
  
    if (response.ok) {
      const data = await response.json();
      console.log(data.message);
      updateImageVersion()
      clearInterval(intervalId);
    } else {
      console.log("HTTP error:", response.status);
    }
  };
  
  const updateImageVersion = () => {
    setImageVersion(Date.now());
  };

  const clearChat = async () => {
    await fetch("/api/generate?endpoint=reset", { method: "POST" });
    fetchChatHistory();
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    sendMessage(message.trim());
    setMessage("");
  };

  return (
    <div>
      <Head>
        <title>game</title>
      </Head>
      <h1 className={styles.heading1}>OpenAI API Test</h1>
      <div className={styles.container}>
        <div className={styles.column}>
          <div className={styles.imageContainer}>
            <img src={`/current.png?ver=${imageVersion}`} alt="Generated Image" />
          </div>
        </div>
        <div className={styles.column}>
          <div className={styles.chatContainer} ref={chatContainerRef}>
            {chatHistory.slice(1).map((msg, index) => (
              <div
                key={index}
                className={msg.role === "user" ? styles.userMessage : styles.assistantMessage}
              >
                {msg.content}
              </div>
            ))}
          </div>
          <div className={styles.messageInputContainer}>
            {options.map((option, index) => (
              <button key={index} className={styles.optionButton} onClick={() => onSelectOption(option)}>
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
