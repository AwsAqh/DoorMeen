import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";

import PopupForm from "@/components/PopupForm";
import Header from "../components/Header";
import Carousel from "../components/Carousel";
import Footer from "../components/Footer";

import PublicPageImage from "@/assets/image.png";
import OwnerPageImage from "@/assets/ownerPage.png";
import BannerImage from "@/assets/banner.png";

import { CreateData, handleCreate } from "../features/queue/handlers";

import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import "../customstyle.css";

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);

  const texts = [
    { h: t('home.subtitle1'), p: t('home.subtitle1Desc') },
    { h: t('home.subtitle2'), p: t('home.subtitle2Desc') },
    { h: t('home.subtitle3'), p: t('home.subtitle3Desc') }
  ];

  const features = [
    { icon: <QrCodeScannerIcon />, text: t('home.feature1') },
    { icon: <LockIcon />, text: t('home.feature2') },
    { icon: <VisibilityOffIcon />, text: t('home.feature3') },
  ];

  const [open, setOpen] = useState(false);
  const [textIndex, setTextIndex] = useState<number>(0);

  useEffect(() => {
    const ping = async () => {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`, {
        method: "GET",
        headers: { "Content-type": "application/json" }
      });
    };
    ping();
  }, []);

  const getErrorMessage = (e: unknown): string =>
    e instanceof Error ? e.message : typeof e === "string" ? e : t('common.error');

  const CLASS = "bg-card text-card-foreground border-border";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = toast.loading(t('queue.creating'), { className: CLASS, duration: Infinity });
    (async () => {
      const a = firstInputRef.current?.value?.trim() ?? "";
      const b = secondInputRef.current?.value?.trim() ?? "";

      try {
        const payload: CreateData = { name: a, password: b };
        const res = await handleCreate(payload);
        toast.success(t('common.success'), { id, className: CLASS, duration: 2500 });
        setOpen(false);
        navigate(`/queue/${res.id}`);
      } catch (err) {
        toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
      }
    })();
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, var(--dm-bg-primary) 0%, var(--dm-bg-secondary) 100%)',
      }}
    >
      <Header />
      <Toaster position="top-center" offset={16} />

      {/* Hero Section */}
      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-16">

          {/* Left: Carousel */}
          <motion.div
            className="mx-auto w-full max-w-xl lg:max-w-2xl"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div
              className="aspect-[16/10] rounded-2xl overflow-hidden glass-card p-2"
            >
              <Carousel
                className="w-full h-full rounded-xl overflow-hidden"
                onNextImage={(i) => setTextIndex(i)}
              >
                <img src={BannerImage} alt="Banner" className="w-full h-full object-contain bg-white" />
                <img src={OwnerPageImage} alt="Owner" className="w-full h-full object-contain bg-white" />
                <img src={PublicPageImage} alt="Public" className="w-full h-full object-contain bg-white" />
              </Carousel>
            </div>
          </motion.div>

          {/* Right: Text + CTA */}
          <motion.div
            className="w-full space-y-8 text-center lg:text-left"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            {/* Dynamic Text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={textIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-4"
              >
                <h2
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight"
                  style={{ color: 'var(--dm-accent)' }}
                >
                  {texts[textIndex].h}
                </h2>
                <p
                  className="text-lg"
                  style={{ color: 'var(--dm-text-secondary)' }}
                >
                  {texts[textIndex].p}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.button
                onClick={() => setOpen(true)}
                className="btn-primary text-lg px-8 py-4 rounded-xl font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('home.createQueue')}
              </motion.button>

              <motion.a
                href="/scan"
                className="btn-outline text-lg px-8 py-4 rounded-xl font-semibold text-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('home.scanQR')}
              </motion.a>
            </motion.div>

            {/* Features List */}
            <motion.ul
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {features.map((feature, idx) => (
                <motion.li
                  key={idx}
                  className="flex items-center gap-3 justify-center lg:justify-start"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + idx * 0.1 }}
                >
                  <span style={{ color: 'var(--dm-accent)' }}>
                    {feature.icon}
                  </span>
                  <span style={{ color: 'var(--dm-text-secondary)' }}>
                    {feature.text}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </main>

      <PopupForm
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        type="create"
        firstInputRef={firstInputRef}
        secondInputRef={secondInputRef}
      />

      <Footer />
    </div>
  );
};

export default Home;
