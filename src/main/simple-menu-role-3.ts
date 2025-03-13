import { type Menu } from "@/stores/menuSlice";
import { getAuth, signOut } from "firebase/auth"; // Import the signOut method
import { initializeApp } from 'firebase/app';
import { DocumentReference, getDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';

const menu: Array<Menu | "divider"> = [
  {
    icon: "MessageSquare",
    title: "Chats",
    pathname:'/chat'
  },
  {
    icon: "HardDrive",
    pathname: "/crud-data-list",
    title: "Contacts",
  },
  // Removed Stats page
  // Removed Assistant page
  // Removed Calendar page
  "divider",
  {
    icon: "Users",
    title: "Users",
    pathname: "/users-layout-2",
  },
  "divider",
];

export default menu; 