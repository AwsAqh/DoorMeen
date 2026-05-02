import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiGetOwnerCustomers } from "@/features/queue/services/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MorphingBlobs from "@/components/background/MorphingBlobs";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AddIcon from "@mui/icons-material/Add";
import PeopleIcon from "@mui/icons-material/People";
import { Status } from "@/components/Helpers/status";

type QueueSummary = {
  id: string;
  name: string;
  waitersCount: number;
  maxCustomers: number | null;
  createdAt: string;
};

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueues = async () => {
      setLoading(true);
      const tokens: { id: string; token: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("queue") && key.endsWith(" token")) {
          const id = key.substring(5, key.length - 6);
          tokens.push({ id, token: localStorage.getItem(key)! });
        }
      }

      const verifiedQueues: QueueSummary[] = [];

      await Promise.allSettled(
        tokens.map(async (t) => {
          try {
            const data = await apiGetOwnerCustomers({ QueueId: t.id, token: t.token });
            // data matches OwnerQueueByIdResDTO
            verifiedQueues.push({
              id: data.Id,
              name: data.Name,
              waitersCount: data.Waiters.filter((w: any) => w.State !== "pending_verification").length,
              maxCustomers: data.MaxCustomers,
              createdAt: data.CreatedAt,
            });
          } catch (error) {
            console.error(`Failed to fetch queue ${t.id}`, error);
            // If unauthorized, remove token
            if (error instanceof Error && error.message.includes("Invalid")) {
              localStorage.removeItem(`queue${t.id} token`);
            }
          }
        })
      );
      
      // Sort by creation date descending
      verifiedQueues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setQueues(verifiedQueues);
      setLoading(false);
    };

    fetchQueues();
  }, []);

  return (
    <MorphingBlobs>
      <div className="min-h-[100svh] flex flex-col font-poppins overflow-x-hidden">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">{t('common.ownerDashboard', 'Owner Dashboard')}</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="btn-primary flex items-center justify-center gap-2 px-4 py-2 rounded-xl"
            >
              <AddIcon fontSize="small" />
              <span className="hidden sm:inline">{t('queue.createNew', 'Create New Queue')}</span>
            </motion.button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-6 rounded-2xl animate-pulse h-40"></div>
              ))}
            </div>
          ) : queues.length === 0 ? (
            <div className="glass-card text-center p-12 mt-12 space-y-4">
              <h2 className="text-xl text-muted-foreground">{t('common.noQueues', 'No queues found on this device')}</h2>
              <p className="text-sm text-foreground/60">{t('common.createOrManage', 'Create a new queue or visit an existing queue link and enter its password.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {queues.map((q) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  onClick={() => navigate(`/owner/q/${q.id}`, { state: { owner: true } })}
                  className="glass-card p-6 cursor-pointer group hover:border-[var(--dm-primary)] transition-all overflow-hidden relative"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--dm-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg truncate pr-4">{q.name}</h3>
                    <div className="text-muted-foreground group-hover:text-[var(--dm-primary)] transition-colors">
                      <ArrowForwardIosIcon fontSize="small" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <PeopleIcon className="text-[var(--dm-primary)]" fontSize="small" />
                    <span className="text-sm font-medium">
                      {q.waitersCount} {q.maxCustomers ? `/ ${q.maxCustomers}` : ""} {t('common.waiting', 'waiting')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </MorphingBlobs>
  );
}
