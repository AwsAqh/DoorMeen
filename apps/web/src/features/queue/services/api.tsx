
export class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = "ApiError";
    }
  }
  
  async function readBody(res: Response) {
    // 204 or empty body → return null
    if (res.status === 204) return null;
    const len = res.headers.get("content-length");
    if (len === "0") return null;
  
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await res.json();
    return await res.text(); // fallback to text bodies (e.g., BadRequest("msg"))
  }

  export async function apiCheckOwnerness(input:{QueueId:number,token:string}){

    

  }
  
  export async function apiCreateQueue(input: { name: string; password: string }) {
    
    const res=await fetch("https://localhost:7014/api/queues",{method:"POST",headers:{"Content-type":"application/json"} , body:JSON.stringify(input) })
    if(!res.ok) throw new Error("failed to create a queue")
    const data=await res.json()
    return data
  
  } 
  
  export async function apiJoinQueue(input: {QueueId:number, Name: string; PhoneNumber: string }) {
    console.log("joining....")
    const res=await fetch("https://localhost:7014/api/queuecustomers",{method:"POST",headers:{"Content-type":"application/json"} , body:JSON.stringify(input) })
    console.log("done")
    const data=await res.json()
    console.log("sdsdsdsdsd",data)
    if(!res.ok)  throw new Error(data)
    
    return data
  }
  
  export async function apiManageQueue(input: {QueueId:number, password: string }) {
    const res=await fetch("https://localhost:7014/api/owners/verify-password",{method:"POST",headers:{"Content-type":"application/json"} , body:JSON.stringify(input) })
    if(!res.ok) throw new Error("Invalid Password")
    const data=await res.json()
   
    return data
  }

  export async function apiCancelRegister(input :{queueId:number,customerId:number,token:string}){
    const res=await fetch(`https://localhost:7014/api/queuecustomers/cancel/${input.queueId}/${input.customerId}`,{method:"DELETE",headers:{"Content-type":"application/json","X-Cancel-Token":input.token} })
    

    if(!res.ok) throw new Error("Failed to cancel registration")
    return true    

  }

  export async function apiGetCustomers(input :{QueueId:number}){
    const res=await fetch(`https://localhost:7014/api/queues/q/${input.QueueId}`,{method:"GET",headers:{"Content-type":"application/json"} })
    const body = await readBody(res);

    if (!res.ok) {
      // try to surface a meaningful message
      const msg =
        typeof body === "string"
          ? body
          : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    // success: return parsed body or true for 204
    return body ?? true; 
  }

  export async function apiGetOwnerCustomers(input :{QueueId:number,token:string}){
    const res=await fetch(`https://localhost:7014/api/owners/q/${input.QueueId}`,{method:"GET",headers:{"Content-type":"application/json","Authorization":`Bearer ${input.token}`} })
    
    const data=await res.json()
    if(!res.ok) throw new Error(data)
    return data

  }
  


  export async function apiUpdateUserStatus(input :{QueueId:number,CustomerId:number,token:string}){
    const res=await fetch(`https://localhost:7014/api/owners/set-in-progress/${input.QueueId}/${input.CustomerId}`,{method:"PUT",headers:{"Content-type":"application/json","Authorization":`Bearer ${input.token}`}  })
    const body = await readBody(res);
    if (!res.ok) {
      // try to surface a meaningful message
      const msg =
        typeof body === "string"
          ? body
          : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    // success: return parsed body or true for 204
    return body ?? true; 
  }  

  

  export async function apiServeCustomer(input :{QueueId:number,CustomerId:number,token:string}){
    const res=await fetch(`https://localhost:7014/api/owners/serve/${input.QueueId}/${input.CustomerId}`,{method:"DELETE",headers:{"Content-type":"application/json","Authorization":`Bearer ${input.token}`}  })
    const body = await readBody(res);

      if (!res.ok) {
        // try to surface a meaningful message
        const msg =
          typeof body === "string"
            ? body
            : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // success: return parsed body or true for 204
      return body ?? true; 

  }

  export async function apiUpdateMaxCustomers(input :{QueueId:number,Max:number, token:string}){
    const res=await fetch(`https://localhost:7014/api/owners/set-max-customers/${input.QueueId}/${input.Max}`,{method:"PUT",headers:{"Content-type":"application/json","Authorization":`Bearer ${input.token}`}  })
    const body = await readBody(res);
    if (!res.ok) {
      // try to surface a meaningful message
      const msg =
        typeof body === "string"
          ? body
          : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    // success: return parsed body or true for 204
    return body ?? true; 
  }  


  export async function apiUpdateQueueName(input :{QueueId:number,name:string, token:string}){
    const res=await fetch(`https://localhost:7014/api/owners/update-name/${input.QueueId}`,{method:"PUT",headers:{"Content-type":"application/json","Authorization":`Bearer ${input.token}`},body:JSON.stringify(input.name)  })
    const body = await readBody(res);
    if (!res.ok) {
      // try to surface a meaningful message
      const msg =
        typeof body === "string"
          ? body
          : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    // success: return parsed body or true for 204
    return body ?? true; 
  }  
  
  