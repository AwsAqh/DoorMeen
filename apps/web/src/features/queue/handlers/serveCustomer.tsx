import { apiServeCustomer } from "../services/api"

export type ServeCustomerData={QueueId:string,CustomerId:number,token:string}

export async function handleServeCustomer(data:ServeCustomerData){


    const res=await apiServeCustomer(data)
    return res
}