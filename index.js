#!/usr/bin/env node

import { intro, outro, text, spinner, confirm, select } from "@clack/prompts";
import OpenAI from "openai";
import Groq from "groq-sdk";

let groqClient, openAIClient;

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
      const chatCompletion = await groqClient.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-8b-8192",
      });

      return chatCompletion.choices[0]?.message?.content || "";
    }

    if (openAIClient) {
      const chatCompletion = await openAIClient.chat.completions.create({
        messages: [
          {
            role: "system",
            content: prompt,
          },
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

    if (ans) {
      console.log();
      console.log(ans);
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
