import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: "dummy_key", apiVersion: "v1alpha" });
const url = `${ai.apiClient.getWebsocketBaseUrl()}/ws/google.ai.generativelanguage.${ai.apiClient.getApiVersion()}.GenerativeService.BidiGenerateContent`;
console.log("Root apiVersion URL:", url);

const ai2 = new GoogleGenAI({ apiKey: "dummy_key", httpOptions: { apiVersion: "v1alpha" } });
const url2 = `${ai2.apiClient.getWebsocketBaseUrl()}/ws/google.ai.generativelanguage.${ai2.apiClient.getApiVersion()}.GenerativeService.BidiGenerateContent`;
console.log("httpOptions.apiVersion URL:", url2);

const ai3 = new GoogleGenAI({ apiKey: "dummy_key", apiVersion: "v1alpha", httpOptions: { apiVersion: "v1alpha" } });
const url3 = `${ai3.apiClient.getWebsocketBaseUrl()}/ws/google.ai.generativelanguage.${ai3.apiClient.getApiVersion()}.GenerativeService.BidiGenerateContent`;
console.log("Both URL:", url3);
