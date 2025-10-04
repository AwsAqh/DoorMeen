import { apiCreateQueue } from "../services/api";

export type CreateData = { name: string; password: string };

export async function handleCreate(data: CreateData) {

  if (!data.name || !/^\d{4,6}$/.test(data.password)) throw new Error("Invalid input");

  const res=await apiCreateQueue(data);
  return res
}
