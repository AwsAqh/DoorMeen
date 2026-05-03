// pages/QueuePage.tsx
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { toast, Toaster } from "sonner";

import Header from "../components/Header";
import Footer from "@/components/Footer";
import MorphingBlobs from "@/components/background/MorphingBlobs";
import Waiter from "@/components/Waiter";
import PopupForm from "@/components/PopupForm";
import QueueQrCard from "@/components/QueueQrCard";
import { StatusEditor } from "@/components/StatusEditor";
import QueueNotFound from "@/components/QueueNotFound";
import NoCustomersFound from "@/components/NoCustomersFound";

import AddIcon from "@mui/icons-material/Add";
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import Stack from "@mui/material/Stack";

import { Mode } from "../components/Helpers/popupFormTypes";
import { type Status } from "../components/Helpers/status";
import type { JoinData, ManageData } from "@/features/queue/handlers";
import { handleJoin, handleManage } from "@/features/queue/handlers";
import { CancelData, handleCancel } from "@/features/queue/handlers/cancel";
import { GetData, handleGetCustomers } from "@/features/queue/handlers/getCustomers";
import { UpdateData, handleupdateStatus } from "@/features/queue/handlers/update";
import { GetOwnerCustomersData, handleGetOwnerCustomers } from "@/features/queue/handlers/getOwnerCustomers";
import { apiVerifyEmail, apiResendVerificationEmail, apiUpdateOwnerMessage, apiUpdateAvgServiceTime, apiSnoozeRegistration, apiUpdateClosingTime } from "@/features/queue/services/api";
import { handleServeCustomer } from "@/features/queue/handlers/serveCustomer";
import { handleUpdateMaxCustomers } from "@/features/queue/handlers/updateMaxCustomers";
import { handleUpdateQueueName, UpdateQueueNameData } from "@/features/queue/handlers/updateQueueName";
import { useOwnerGuard } from "@/hooks/useOwnerGuard";
import { useOwnerSession } from "@/hooks/useOwnerSession";
import { useQueueSignalR } from "@/hooks/useQueueSignalR";

type User = {
  Id: number;
  QueueId: string;
  Name: string;
  PhoneNumber: string;
  State: Status;
  CreatedAt?: Date;
};

type PageMode = "public" | "owner";

function UserRow({
  user,
  onChange,
}: {
  user: User;
  onChange: (nextStatus: string, CustomerId: number) => void | Promise<void>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <div className="waiter-row">
          <div className="waiter-meta">
            <span className="waiter-name">{user.Name}</span>
            <span className="waiter-phone">{user.PhoneNumber}</span>
          </div>
          <StatusEditor value={user.State} onSave={(nextStatus) => { onChange(nextStatus, user.Id) }} inline />
        </div>
      </Stack>
    </motion.div>
  );
}

export default function QueuePage({ mode }: { mode: PageMode }) {
  const { t } = useTranslation();
  const API = import.meta.env.VITE_API_BASE_URL;
  const params = useParams<{ id?: string }>();
  const currentQueueId: string = params.id ?? "";
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [queueName, setQueueName] = useState<string>("");
  const [ownerMessage, setOwnerMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const { signedIn } = useOwnerSession(currentQueueId!, `${API}/api/owners/check-owner/${currentQueueId}`);
  const [currentMaxCustomers, setCurrentMaxCustomers] = useState<number | null>(null);
  const [draftMax, setDraftMax] = useState<number>((currentMaxCustomers ?? 10));
  const [avgServiceTime, setAvgServiceTime] = useState<number>(15);
  const [closingTime, setClosingTime] = useState("");
  const [anyChange, setAnyChange] = useState(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const queueNameRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLInputElement>(null);
  const [editingQueueName, setEditingQueueName] = useState<string | null>(null);
  const [isNameEditing, setIsNameEditing] = useState<boolean>(false);
  const [isMessageEditing, setIsMessageEditing] = useState<boolean>(false);

  useOwnerGuard(currentQueueId, mode);

  const RANK: Record<Status, number> = {
    in_progress: 0,
    pending_verification: 0.5,
    waiting: 1,
    served: 3
  };

  const sortUsers = (list: User[]) =>
    [...list].sort(
      (a, b) =>
        RANK[a.State as Status] - RANK[b.State as Status] ||
        new Date(a.CreatedAt ?? 0).getTime() - new Date(b.CreatedAt ?? 0).getTime()
    );

  useQueueSignalR({
    queueId: currentQueueId,
    onCustomerJoined: (customer) => {
      const cId = customer.Id ?? customer.id;
      if (cId === undefined) return;
      const newUser: User = { 
        ...customer, 
        Id: cId, 
        Name: customer.Name ?? customer.name, 
        PhoneNumber: customer.PhoneNumber ?? customer.phone ?? customer.phoneNumber, 
        State: customer.State ?? customer.state 
      };
      setUsers((prev) => {
        if (prev.some((u) => u.Id === cId)) return prev;
        return sortUsers([...prev, newUser]);
      });
    },
    onCustomerVerified: (customer) => {
      const cId = customer.Id ?? customer.id;
      if (cId === undefined) return;
      const newUser: User = { 
        ...customer, 
        Id: cId, 
        Name: customer.Name ?? customer.name, 
        PhoneNumber: customer.PhoneNumber ?? customer.phone ?? customer.phoneNumber, 
        State: customer.State ?? customer.state 
      };
      setUsers((prev) => {
        const updated = prev.some((u) => u.Id === cId)
          ? prev.map((u) => (u.Id === cId ? newUser : u))
          : [...prev, newUser];
        return sortUsers(updated);
      });
    },
    onCustomerLeft: (customerId) => {
      setUsers((prev) => prev.filter((u) => u.Id !== customerId));
    },
    onCustomerStatusChanged: (resDto) => {
      const rId = resDto.Id ?? resDto.id;
      const rState = resDto.State ?? resDto.state;
      setUsers((prev) => {
        const updated = prev.map((u) =>
          u.Id === rId ? { ...u, State: rState } : u
        );
        return sortUsers(updated);
      });
    },
    onCustomerServed: (customerId) => {
      setUsers((prev) => prev.filter((u) => u.Id !== customerId));
    },
    onMessageUpdated: (message) => {
      setOwnerMessage(message);
    }
  });

  useEffect(() => {
    setDraftMax(currentMaxCustomers ?? 10);
  }, [currentMaxCustomers]);

  const effectiveCurrent = currentMaxCustomers ?? 10;
  const CLASS = "bg-card text-card-foreground border-border";

  const getErrorMessage = (e: unknown): string =>
    e instanceof Error ? e.message : typeof e === "string" ? e : t('common.error');

  // Get customers for public
  useEffect(() => {
    if (mode !== "public") return;
    const LOADING_ID = `queue:${currentQueueId}:fetch`;

    const getCustomer = async () => {
      toast.loading(t('queue.fetching'), {
        id: LOADING_ID,
        className: CLASS,
        duration: Infinity,
      });

      try {
        const payload: GetData = { QueueId: currentQueueId };
        const data = await handleGetCustomers(payload);
        setQueueName(data.Name);
        setOwnerMessage(data.OwnerMessage || null);
        setAvgServiceTime(data.AvgServiceTime ?? 15);
        setUsers(data.Waiters);
        toast.dismiss(LOADING_ID);
      } catch (err) {
        setNotFound(true);
        toast.dismiss(LOADING_ID);
        toast.error(getErrorMessage(err), { className: CLASS, duration: 5000 });
      }
    };

    void getCustomer();
    return () => { toast.dismiss(LOADING_ID); };
  }, [mode, currentQueueId]);

  // Get customer as owner
  useEffect(() => {
    const token = localStorage.getItem(`queue${currentQueueId} token`);
    if (!token) return;

    const getOwnerCustomers = async () => {
      const LOADING_ID = `queue:${currentQueueId}:fetch:owner`;
      toast.loading(t('queue.fetching'), {
        id: LOADING_ID,
        className: CLASS,
        duration: Infinity,
      });

      try {
        const payload: GetOwnerCustomersData = {
          QueueId: currentQueueId,
          token: token ?? "",
        };
        const data = await handleGetOwnerCustomers(payload);
        toast.dismiss(LOADING_ID);
        setQueueName(data.Name);
        setOwnerMessage(data.OwnerMessage || null);
        setAvgServiceTime(data.AvgServiceTime ?? 15);
        setUsers(data.Waiters);
        setCurrentMaxCustomers(data.MaxCustomers ?? null);
        setEditingQueueName(data.Name);
      } catch (err) {
        setNotFound(true);
        toast.dismiss(LOADING_ID);
        toast.error(getErrorMessage(err), { className: CLASS, duration: 5000 });
      }
    };

    if (mode === "owner") {
      void getOwnerCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentQueueId]);

  useEffect(() => {
    if (isNameEditing) {
      queueNameRef.current?.focus();
      queueNameRef.current?.select();
    }
  }, [isNameEditing]);

  useEffect(() => {
    if (isMessageEditing) {
      messageRef.current?.focus();
      if (!ownerMessage) {
        messageRef.current?.select();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMessageEditing]);

  const owner = mode === "owner";

  const updateOwnerMessage = async () => {
    if (!owner) return;
    const msg = messageRef.current?.value || null;
    const token = localStorage.getItem(`queue${currentQueueId} token`);
    if (!token) return;

    try {
      await apiUpdateOwnerMessage({ QueueId: currentQueueId, Message: msg, token });
      setOwnerMessage(msg);
      setIsMessageEditing(false);
      toast.success(t('common.success'), { className: CLASS });
    } catch (err) {
      toast.error(getErrorMessage(err), { className: CLASS });
    }
  };

  const [open, setOpen] = useState(false);
  const [popupMode, setPopupMode] = useState<Mode>("join");
  const [pendingJoinData, setPendingJoinData] = useState<(JoinData & { Id: number }) | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);
  const thirdInputRef = useRef<HTMLInputElement>(null);

  const submitJoinForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = firstInputRef.current?.value?.trim() ?? "";
    const b = secondInputRef.current?.value?.trim() ?? "";
    const c = thirdInputRef.current?.value?.trim() ?? "";

    if (popupMode !== "join") return;
    if (!a || !b || !c) {
      toast.error(t('common.error'), { className: CLASS, duration: 3000 });
      return;
    }

    const id = toast.loading(t('queue.joining'), { className: CLASS, duration: Infinity });

    try {
      const payload: JoinData = { QueueId: currentQueueId, Name: a, PhoneNumber: b, Email: c };
      const { Id } = await handleJoin(payload);
      toast.success(t('queue.pinSent'), { id, className: CLASS, duration: 2500 });

      // Store pending data and switch to verify mode
      setPendingJoinData({ ...payload, Id });

      if (firstInputRef.current) firstInputRef.current.value = "";
      setPopupMode("verify");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    }
  };

  const submitVerifyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingJoinData) return;

    // In verify mode, firstInputRef is the PIN
    const pin = firstInputRef.current?.value?.trim() ?? "";
    if (!pin) {
      toast.error(t('common.error'), { className: CLASS });
      return;
    }

    const id = toast.loading("Verifying...", { className: CLASS, duration: Infinity });

    try {
      const res = await apiVerifyEmail({
        CustomerId: pendingJoinData.Id,
        Email: pendingJoinData.Email,
        Digits: Number(pin)
      });

      toast.success(t('common.success'), { id, className: CLASS, duration: 2500 });

      if (res?.Token) {
        localStorage.setItem(`queueCancelToken${pendingJoinData.Id}`, res.Token);
      }

      // Verification successful, add user to list
      const newUser: User = {
        ...pendingJoinData,
        State: "waiting"
      };
      setUsers(prev => [...prev, newUser]);

      setOpen(false);
      setPopupMode("join");
      setPendingJoinData(null);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    }
  };

  const handleResendPin = async () => {
    if (!pendingJoinData) return;
    const id = toast.loading("Sending...", { className: CLASS });
    try {
      await apiResendVerificationEmail({ CustomerId: pendingJoinData.Id });
      toast.success(t('popupForm.verify.resendSuccess'), { id, className: CLASS });
    } catch (err) {
      toast.error(getErrorMessage(err), { id, className: CLASS, duration: 5000 });
    }
  };

  const submitManageForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (owner) return;

    const a = firstInputRef.current?.value?.trim() ?? "";
    if (!a) {
      toast.error(t('common.error'), { className: CLASS, duration: 3000 });
      return;
    }

    const id = toast.loading(t('queue.managing'), { className: CLASS, duration: Infinity });

    try {
      const payload: ManageData = { QueueId: currentQueueId, password: a };
      const { queueId, token } = await handleManage(payload);
      toast.success(t('common.success'), { id, className: CLASS, duration: 2500 });
      localStorage.setItem(`queue${queueId} token`, token);
      setOpen(false);
      navigate(`/owner/q/${queueId}`, { replace: true });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    }
  };

  const cancelRegister = async (cancelId: number) => {
    const id = toast.loading(t('queue.canceling'), { className: CLASS, duration: Infinity });
    try {
      const payload: CancelData = {
        queueId: currentQueueId,
        customerId: cancelId,
        token: localStorage.getItem(`queueCancelToken${cancelId}`) || ""
      };
      await handleCancel(payload);
      toast.success(t('common.success'), { id, className: CLASS, duration: 2500 });
      setUsers(users.filter(u => u.Id != payload.customerId));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    }
  };

  const snoozeRegister = async (customerID: number) => {
    const toastId = toast.loading("Snoozing spot...", { className: CLASS, duration: Infinity });
    try {
      const token = localStorage.getItem(`queueCancelToken${customerID}`);
      if (token) {
        await apiSnoozeRegistration({ queueId: currentQueueId!, customerId: customerID, token });
        toast.success("Spot pushed back!", { id: toastId, className: CLASS, duration: 2500 });
      } else {
        toast.dismiss(toastId);
      }
    } catch {
      toast.error("Failed to snooze registration.", { id: toastId, className: CLASS, duration: 2500 });
    }
  };

  const updateStatus = async (nextStatus: string, CustomerId: number) => {
    const id = toast.loading(t('queue.updating'), { className: CLASS, duration: Infinity });
    try {
      const payload: UpdateData = {
        QueueId: currentQueueId,
        CustomerId,
        token: localStorage.getItem(`queue${currentQueueId} token`) || ""
      };

      switch (nextStatus) {
        case "in_progress": {
          await handleupdateStatus(payload);
          toast.success(t('common.success'), { id, className: CLASS, duration: 2500 });
          setUsers(prev => {
            const updated = prev?.map(u =>
              u.Id === CustomerId ? { ...u, State: "in_progress" as Status } : u
            );
            return sortUsers(updated);
          });
          break;
        }
        case "served": {
          await handleServeCustomer(payload);
          toast.success(t('common.success'), { id, className: CLASS, duration: 2500 });
          setUsers(prev => prev.filter(u => u.Id !== CustomerId));
          break;
        }
        case "waiting":
        case "pending_verification": {
          throw new Error("Cannot rollback a customer to a previous waiting state.");
        }
        default:
          toast.dismiss(id);
          break;
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    }
  };

  const onMaxChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const val = Number(e.target.value);
    setDraftMax(val);
    setAnyChange(val !== effectiveCurrent);
  };

  const onNameChange = () => {
    setEditingQueueName(queueNameRef.current?.value ?? "");
  };

  const updateDashboardSettings = async () => {
    const LOADING_ID = toast.loading(t('queue.updating'), { className: CLASS, duration: Infinity });
    const token = localStorage.getItem(`queue${currentQueueId} token`) || "";
    try {
      setSaveLoading(true);
      
      // 1) Capacity
      if (draftMax !== effectiveCurrent) {
        await handleUpdateMaxCustomers({ QueueId: currentQueueId, Max: draftMax, token });
        setCurrentMaxCustomers(draftMax);
      }

      // 2) Average Service Time
      await apiUpdateAvgServiceTime({ QueueId: currentQueueId, Minutes: avgServiceTime, token });

      // 3) Closing Time
      await apiUpdateClosingTime({ QueueId: currentQueueId, timeString: closingTime, token });

      setAnyChange(false);
      toast.success(t('common.success'), { id: LOADING_ID, className: CLASS, duration: 2500 });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { id: LOADING_ID, className: CLASS, duration: 5000 });
    } finally {
      setSaveLoading(false);
    }
  };

  const updateQueueName = async () => {
    const id = toast.loading(t('queue.updating'), { className: CLASS, duration: Infinity });
    try {
      const payload: UpdateQueueNameData = {
        QueueId: currentQueueId,
        name: queueNameRef.current?.value ?? "",
        token: localStorage.getItem(`queue${currentQueueId} token`) || ""
      };
      await handleUpdateQueueName(payload);
      toast.success(t('common.success'), { id, className: CLASS, duration: 2500 });
      setQueueName(queueNameRef.current?.value ?? "");
      setIsNameEditing(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    }
  };

  return (
    <MorphingBlobs>
      <div className="min-h-[100svh] flex flex-col font-poppins overflow-x-hidden">
        <Header />
        <Toaster position="top-center" offset={16} />

        <div className="flex-1 w-full flex flex-col items-center gap-8 px-4 py-10">
          {notFound ? (
            <QueueNotFound />
          ) : (
            <>
              {/* Queue Title */}
              <motion.div
                className="text-center space-y-6 w-full max-w-2xl"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-center gap-4">
                  {mode === "public" && (
                    <h1
                      className="text-3xl font-bold"
                      style={{ color: 'var(--dm-accent)' }}
                    >
                      {queueName}
                    </h1>
                  )}

                  {mode === "owner" && (
                    <>
                      {isNameEditing ? (
                        <input
                          ref={queueNameRef}
                          value={editingQueueName ?? ""}
                          onChange={onNameChange}
                          placeholder={t('queue.queueName')}
                          className="text-3xl font-bold text-center bg-transparent border-0 border-b-2 focus:outline-none transition-colors"
                          style={{
                            color: 'var(--dm-accent)',
                            borderColor: 'var(--dm-accent)',
                          }}
                        />
                      ) : (
                        <h1
                          className="text-3xl font-bold"
                          style={{ color: 'var(--dm-accent)' }}
                        >
                          {queueName}
                        </h1>
                      )}

                      {!isNameEditing ? (
                        <motion.button
                          onClick={() => {
                            setIsNameEditing(true);
                            queueNameRef.current?.focus();
                            queueNameRef.current?.select();
                          }}
                          className="p-2 rounded-full"
                          style={{
                            background: 'var(--dm-surface)',
                            color: 'var(--dm-text-primary)',
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          title={t('queue.actions.updateName')}
                        >
                          <ModeEditIcon fontSize="small" />
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={updateQueueName}
                            className="btn-primary px-3 py-1.5 text-sm rounded-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {t('common.save')}
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              setIsNameEditing(false);
                              setEditingQueueName(queueName);
                            }}
                            className="btn-outline px-3 py-1.5 text-sm rounded-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {t('common.cancel')}
                          </motion.button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Owner Message Bar */}
                {(ownerMessage || owner) && (
                  <div className="flex flex-col items-center justify-center mb-6">
                    {!isMessageEditing ? (
                      <div 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full max-w-md cursor-pointer transition-colors relative`}
                        style={{
                           background: ownerMessage ? 'rgba(234, 179, 8, 0.15)' : 'var(--dm-surface)',
                           border: `1px solid ${ownerMessage ? 'rgba(234, 179, 8, 0.4)' : 'var(--dm-surface-border)'}`,
                           minHeight: '52px'
                        }}
                        onClick={() => {
                          if (owner) setIsMessageEditing(true);
                        }}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill={ownerMessage ? "#eab308" : "var(--dm-text-muted)"} viewBox="0 0 256 256"><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM216,192H40V64H216V192Zm-32-80a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,112Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,144Z"></path></svg>
                         <div className="flex-1 text-sm text-center">
                            {ownerMessage ? (
                               <span style={{ color: 'var(--dm-text-primary)' }}>{ownerMessage}</span>
                            ) : (
                               <span style={{ color: 'var(--dm-text-muted)', fontStyle: 'italic' }}>
                                  Add a notice for your customers...
                               </span>
                            )}
                         </div>
                         {owner && (
                            <ModeEditIcon fontSize="small" style={{ color: 'var(--dm-text-muted)' }} />
                         )}
                      </div>
                    ) : (
                      <div className="flex w-full items-center gap-2 max-w-md">
                        <input
                          ref={messageRef}
                          defaultValue={ownerMessage || ""}
                          placeholder="e.g., On break for 15 mins"
                          className="flex-1 rounded-xl px-4 py-2 border bg-transparent outline-none transition-all"
                          style={{
                            color: 'var(--dm-text-primary)',
                            borderColor: 'var(--dm-accent)'
                          }}
                        />
                        <motion.button
                          onClick={updateOwnerMessage}
                          className="btn-primary px-3 py-2 text-sm rounded-lg"
                        >
                          {t('common.save')}
                        </motion.button>
                        <motion.button
                          onClick={() => setIsMessageEditing(false)}
                          className="btn-outline px-3 py-2 text-sm rounded-lg"
                        >
                          {t('common.cancel')}
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}

                {/* QR Card */}
                {currentQueueId !== "" && <QueueQrCard queueId={currentQueueId} />}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <motion.button
                    className="btn-primary px-6 py-3 rounded-xl"
                    onClick={() => {
                      if (signedIn) {
                        navigate(`/owner/q/${currentQueueId}`, { state: { owner: true } });
                      } else {
                        setPopupMode("manage");
                        setOpen(true);
                      }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {mode === "owner"
                      ? t('queue.signedIn')
                      : signedIn
                        ? t('queue.dashboard')
                        : t('queue.actions.manage')}
                  </motion.button>

                  {mode === "owner" && (
                    <>
                      <motion.button
                        type="button"
                        aria-label={t('common.close')}
                        onClick={() => navigate(`/queue/${currentQueueId}`)}
                        className="p-3 rounded-full"
                        style={{
                          background: 'var(--dm-surface)',
                          color: 'var(--dm-text-primary)',
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <RemoveRedEyeIcon fontSize="small" />
                      </motion.button>

                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <select
                            value={String(draftMax)}
                            onChange={onMaxChange}
                            className="appearance-none rounded-lg px-3 pr-10 py-2 text-sm transition-colors cursor-pointer"
                            style={{
                              background: 'var(--dm-surface)',
                              color: 'var(--dm-text-primary)',
                              border: '1px solid var(--dm-surface-border)',
                            }}
                          >
                            <option disabled>{t('queue.maxCustomers')}</option>
                            <option value="2">2 {t('queue.customers')}</option>
                            <option value="5">5 {t('queue.customers')}</option>
                            <option value="8">8 {t('queue.customers')}</option>
                            <option value="10">+10 {t('queue.customers')}</option>
                          </select>
                          <svg
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4"
                            style={{ color: 'var(--dm-text-muted)' }}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06L10.53 12.6a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>

                        {/* Avg Service Time config */}
                        <div className="relative">
                          <select
                            value={String(avgServiceTime)}
                            onChange={(e) => {
                              setAvgServiceTime(Number(e.target.value));
                              setAnyChange(true);
                            }}
                            className="appearance-none rounded-lg px-3 pr-10 py-2 text-sm transition-colors cursor-pointer"
                            style={{
                              background: 'var(--dm-surface)',
                              color: 'var(--dm-text-primary)',
                              border: '1px solid var(--dm-surface-border)',
                            }}
                          >
                            <option disabled>Avg Service Time</option>
                            <option value="5">⏱ 5 min/person</option>
                            <option value="10">⏱ 10 min/person</option>
                            <option value="15">⏱ 15 min/person</option>
                            <option value="20">⏱ 20 min/person</option>
                            <option value="30">⏱ 30 min/person</option>
                          </select>
                          <svg
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4"
                            style={{ color: 'var(--dm-text-muted)' }}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06L10.53 12.6a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>

                        <div className="flex-1 relative">
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--dm-text-muted)' }}>
                            Closing / Reset Time
                          </label>
                          <input
                            type="time"
                            value={closingTime}
                            onChange={(e) => {
                              setClosingTime(e.target.value);
                              setAnyChange(true);
                            }}
                            className="w-[125px] bg-transparent text-sm font-medium border border-white/10 rounded-lg px-3 py-2 outline-none appearance-none"
                            style={{ 
                              color: 'var(--dm-text-primary)'
                            }}
                          />
                        </div>

                        {anyChange && (
                          <motion.button
                            onClick={updateDashboardSettings}
                            className="btn-primary px-4 py-2 text-sm rounded-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {saveLoading ? t('queue.saving') : t('common.save')}
                          </motion.button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Customer List */}
              <div className="w-full max-w-3xl">
                <main className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {users?.length === 0 ? (
                      <NoCustomersFound
                        owner={owner}
                        onAction={() => {
                          setPopupMode("join");
                          setOpen(true);
                        }}
                      />
                    ) : owner ? (
                      users?.map((u, idx) => (
                        <motion.div
                          key={u.Id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                        >
                          <UserRow
                            user={u}
                            onChange={(nextStatus: string) => updateStatus(nextStatus, u.Id)}
                          />
                        </motion.div>
                      ))
                    ) : (
                      users?.map((u, idx) => (
                        <motion.div
                          key={u.Id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                        >
                          <Waiter
                            id={u.Id}
                            name={u.Name}
                            phone={owner ? u.PhoneNumber : ""}
                            status={u.State}
                            estimatedWait={
                              u.State === "waiting"
                                ? (() => {
                                    const waitingOnly = users.filter(x => x.State === "waiting");
                                    const pos = waitingOnly.findIndex(x => x.Id === u.Id);
                                    return pos >= 0 ? (pos + 1) * avgServiceTime : null;
                                  })()
                                : null
                            }
                            onCancel={(id) => cancelRegister(id)}
                            onSnooze={(id) => snoozeRegister(id)}
                          />
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </main>

                {/* Add to Queue Button */}
                {users?.length !== 0 && (
                  <motion.div
                    className="mt-6 flex justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.button
                      onClick={() => { setPopupMode("join"); setOpen(true); }}
                      aria-label={t('queue.joinQueue')}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl"
                      style={{
                        background: 'var(--dm-surface)',
                        color: 'var(--dm-text-primary)',
                        border: '1px solid var(--dm-surface-border)',
                      }}
                      whileHover={{ scale: 1.02, borderColor: 'var(--dm-accent)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <AddIcon fontSize="small" />
                      <span>{t('queue.addToQueue')}</span>
                    </motion.button>
                  </motion.div>
                )}
              </div>

              <PopupForm
                open={open}
                onClose={() => setOpen(false)}
                onSubmit={
                  popupMode === "join" ? submitJoinForm :
                    popupMode === "verify" ? submitVerifyForm :
                      submitManageForm
                }
                onResend={popupMode === "verify" ? handleResendPin : undefined}
                firstInputRef={firstInputRef}
                secondInputRef={secondInputRef}
                thirdInputRef={thirdInputRef}
                type={popupMode}
              />
            </>
          )}
        </div>

        <Footer />
      </div>
    </MorphingBlobs>
  );
}
