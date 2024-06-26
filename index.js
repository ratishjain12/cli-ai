#!/usr/bin/env node

import { intro, outro, text, spinner, confirm, select } from "@clack/prompts";
import OpenAI from "openai";
import Groq from "groq-sdk";
import axios from "axios";

let groqClient, openAIClient;
let history = [];

const searchStackOverflow = async (query) => {
  try {
    const response = await axios.get(
      "https://api.stackexchange.com/2.3/search/advanced",
      {
        params: {
          order: "desc",
          sort: "relevance",
          q: query,
          site: "stackoverflow",
        },
      }
    );

    return response?.data?.items.map((item) => item.link);
  } catch (e) {
    return [];
  }
};

async function getCompletion(prompt, apiKey, AiService) {
  if (!groqClient && AiService === "groq") {
    groqClient = new Groq({
      apiKey: apiKey,
    });
  } else if (!openAIClient && AiService === "openai") {
    openAIClient = new OpenAI({
      apiKey: apiKey,
    });
  }

  try {
    if (groqClient) {
      let msgObj = [];
      if (history.length > 0) {
        msgObj = history.map((item) => {
          return { role: "system", content: item };
        });
      }

      const chatCompletion = await groqClient.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
          ...msgObj,
        ],
        model: "llama3-8b-8192",
      });

      return chatCompletion.choices[0]?.message?.content || "";
    }

    if (openAIClient) {
      let msgObj = [];
      if (history.length > 0) {
        msgObj = history.map((item) => {
          return { role: "system", content: item };
        });
      }
      const chatCompletion = await openAIClient.chat.completions.create({
        messages: [
          {
            role: "system",
            content: prompt,
          },
          ...msgObj,
        ],
        model: "gpt-3.5-turbo-0125",
        response_format: { type: "json_object" },
      });

      return chatCompletion.choices[0]?.message?.content || "";
    }
  } catch (e) {
    console.log(e.message);
  }
}

async function main() {
  intro(`Welcome to prompt-cli!!!`);
  const AiService = await select({
    message: "Pick a client",
    options: [
      { value: "groq", label: "Groq" },
      { value: "openai", label: "Open AI" },
    ],
  });

  const apiKey = await text({
    type: "input",
    name: "name",
    message: "Enter your api key",
  });

  while (true) {
    const prompt = await text({
      type: "input",
      name: "prompt",
      message: "How can I help you?",
    });

    const s = spinner();
    s.start("loading...");

    const ans = await getCompletion(prompt, apiKey, AiService);
    let links;
    if (prompt.includes("-stackoverflow") || prompt.includes("-s")) {
      let modified = prompt.replace("-stackoverflow", "");
      modified.replace("-s", "");
      links = await searchStackOverflow(modified);
    }

    if (ans) {
      console.log();
      history.push(prompt);
      history.push(ans);
      console.log(ans);
      if (links) {
        console.log("Links from stackoverflow: ");
        links?.slice(0, 5).forEach((link) => console.log(link));
      }
    }
    s.stop("generated.");
    const shouldContinue = await confirm({
      message: "Do you want to continue?",
    });

    if (!shouldContinue) {
      break;
    }
  }

  outro(`You're all set!`);
}

main().catch(console.error);
