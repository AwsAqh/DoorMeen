
import { apiCancelRegister } from "../services/api";
export type CancelData={queueId:number ,customerId:number,token:string }

export async function handleCancel(data:CancelData){

    //if(!data.customerId || !data.token ||!data.queueId) throw new Error("all field are requried")
     const res=await  apiCancelRegister(data)
    return res  

}