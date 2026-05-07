import "server-only";
import { AzureOpenAI } from "openai";
import { config } from "./config";

let cliente: AzureOpenAI | null = null;

export function getOpenAI(): AzureOpenAI {
  if (cliente) return cliente;
  cliente = new AzureOpenAI({
    endpoint: config.openai.endpoint,
    apiKey: config.openai.apiKey,
    apiVersion: config.openai.apiVersion,
  });
  return cliente;
}

export const DEPLOYMENTS = {
  chat: config.openai.chatDeployment,
  embed: config.openai.embedDeployment,
};
