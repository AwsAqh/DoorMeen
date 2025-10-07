import { apiUpdateMaxCustomers } from "../services/api";


export type UpdateMaxCustomersData={QueueId:number,Max:number,token:string}

export async function handleUpdateMaxCustomers(data:UpdateMaxCustomersData){

    const res=await apiUpdateMaxCustomers(data)
    return res
}