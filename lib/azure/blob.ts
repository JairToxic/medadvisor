import "server-only";
import { BlobServiceClient } from "@azure/storage-blob";
import { config } from "./config";

let servicio: BlobServiceClient | null = null;

export function getBlobService(): BlobServiceClient {
  if (servicio) return servicio;
  servicio = BlobServiceClient.fromConnectionString(config.storage.connectionString);
  return servicio;
}

export function getContenedor(nombre: string) {
  return getBlobService().getContainerClient(nombre);
}

export function getContenedorPolizas() {
  return getContenedor(config.storage.contenedorPolizas);
}

export function getContenedorPacientes() {
  return getContenedor("pacientes");
}

export function getContenedorHistorial() {
  return getContenedor("historial");
}
