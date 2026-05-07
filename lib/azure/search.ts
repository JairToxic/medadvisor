import "server-only";
import { AzureKeyCredential, SearchClient, SearchIndexClient } from "@azure/search-documents";
import { config } from "./config";

const credential = () => new AzureKeyCredential(config.search.apiKey);

export function getSearchClient<T extends object>(indice = config.search.indiceHospitales) {
  return new SearchClient<T>(config.search.endpoint, indice, credential());
}

export function getSearchIndexClient() {
  return new SearchIndexClient(config.search.endpoint, credential());
}
