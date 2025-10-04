import { apiUpdateUserStatus } from "../services/api";

export type UpdateData={QueueId:number,CustomerId:number,token:string}

export async function handleupdateStatus(data:UpdateData){
    console.log(data)
    if(!data.QueueId || !data.CustomerId || !data.token) throw new Error("All fields are required")
    const res=await apiUpdateUserStatus(data)
    return res

}