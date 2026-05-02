import { apiUpdateQueueName } from "../services/api";

export type UpdateQueueNameData={QueueId:string,name:string,token:string}

export async function handleUpdateQueueName(data:UpdateQueueNameData){
    const res=await apiUpdateQueueName(data)
    return res
}