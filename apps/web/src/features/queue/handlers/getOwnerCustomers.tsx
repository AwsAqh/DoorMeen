import { apiGetOwnerCustomers } from "../services/api";

export type GetOwnerCustomersData={QueueId:number,token:string}

export async function handleGetOwnerCustomers(data:GetOwnerCustomersData){

        if(!data.QueueId || !data.token)throw new Error("All field are required")
        const res=await apiGetOwnerCustomers(data)
        return res

}