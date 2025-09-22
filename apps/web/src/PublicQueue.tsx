import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getQueue } from "./api";



export default function PublicQueue(){
    const {id}=useParams();
    const [data,setData]=useState<any>(null);
    const [error,setError]=useState<string | null>(null);
    const [loading,setLoading]=useState<boolean>(false);
    
    useEffect(() => {
      if (!id) return
      setLoading(true)
      setError(null)
      getQueue(id)
        .then(setData)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoading(false))
    }, [id])
  
    if (error) return <div className="p-6 text-rose-600">Error: {error}</div>
    if (!data) return <div className="p-6">Loading…</div>
    
    return ( <div className="p-6 space-y-3">
              <h1 className="text-2xl font-bold">Queue #{data.id}</h1>
              <p>Now Serving: <b>{data.nowServing}</b></p>
              <p>Next: {data.next.join(", ")}</p>
              <p>Avg time (min): {Math.ceil(data.avgServiceSeconds/60)}</p>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded bg-black text-white">Join</button>
                <button className="px-4 py-2 rounded bg-gray-200">Cancel</button>
              </div>
  </div>)
}
  
  
  
    