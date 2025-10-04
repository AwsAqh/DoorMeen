import { apiManageQueue } from "../services/api";

export type ManageData = {QueueId:number,password: string };

export async function handleManage(data: ManageData) {
  if (!/^\d{4,6}$/.test(data.password)) throw new Error("Invalid PIN");


  const res=await apiManageQueue(data);
 
    return res
}
