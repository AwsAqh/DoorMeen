import { minLength } from "zod";

// PopupForm.tsx (or a shared file)
export const COPIES = {
    create: {
      title: "Create a Queue",
      subTitle: "Set a name and a PIN (4–6 digits) for the queue.",
      label1: "Queue name",
      placeholder1: "Enter queue name…",
      input1type:"text",
      label2: "PIN",
      placeholder2: "4–6 digits",
      input2type:"password",
      input2MinLength:4,
      input2MaxLength:6,
      pattern:"",
      note: "Only digits, 4–6 length.",
      action: "Create",
   
    },
    join: {
      title: "Join a queue",
      subTitle: "Join this queue with your name and phone number",
      label1: "Name",
      placeholder1: "Enter your name…",
      input1type:"text",
      label2: "Phone number",
      placeholder2: "05xxxxxxxx",
      input2type:"numeric",
      input2MinLength:10,
      input2MaxLength:10,
      pattern:"^05[0-9]{8}$",
      note: "Enter your 10 digits phone number",
      action: "Join",
    },
    manage: {
      title: "Manage this queue",
      subTitle: "Enter owner PIN to manage the queue.",
      label1: "Owner PIN",
      placeholder1: "4–6 digits",
      input1type:"password",
      label2: "—",
      placeholder2: "",
      input2type:"",
      input2MinLength:"",
      input2MaxLength:"",
      pattern:"",
      note: "Only digits, 4–6 length.",
      action: "Manage",
    },
  } as const;
  
  export type Mode = keyof typeof COPIES; // "create" | "join" | "manage"
  