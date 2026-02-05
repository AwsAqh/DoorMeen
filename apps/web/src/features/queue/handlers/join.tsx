import { JoinSchema } from "../validations/join.schema";
import { apiJoinQueue } from "../services/api";


export type JoinData = { QueueId: number, Name: string, PhoneNumber: string, Email: string }
export async function handleJoin(input: JoinData) {
  const parsed = JoinSchema.safeParse(input);
  if (!parsed.success) {
    // bubble a readable message
    throw new Error("Invalid input ya aws");
  }
  const server = await apiJoinQueue(parsed.data);
  return server;
}
