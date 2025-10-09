import {  apiGetCustomers } from "../services/api";
export type GetData={QueueId:number}

export async function handleGetCustomers(data:GetData){

    if(!data.QueueId)throw new Error("Queue id can't be null")
    const res=await apiGetCustomers(data)
    return res
}