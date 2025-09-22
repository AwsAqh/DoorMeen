const API=import.meta.env.VITE_API_URL;
export async function getQueue(queueId:string){

    const r=await fetch(`${API}/api/queues/${queueId}/public`)
    if(!r.ok) throw new Error("Failed to fetch queue");

    return r.json() as Promise<{
        id:string;
        nowServing: number
        next: number[]
        avgServiceSeconds: number
        counters: number
    }>

}