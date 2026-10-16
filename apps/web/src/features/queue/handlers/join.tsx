import { JoinSchema } from "../validations/join.schema";
import { apiJoinQueue } from "../services/api";


export type JoinData = { QueueId: string, Name: string, PhoneNumber: string, Email: string }
export async function handleJoin(input: JoinData) {
  const parsed = JoinSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid join details");
  }
  const server = await apiJoinQueue(parsed.data);
  return server;
}
