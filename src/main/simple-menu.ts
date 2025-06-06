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

  {
    icon: "AreaChart",
    pathname: "/dashboard",
    title: "Stats",
  },
  {
      icon: "Bot",
      pathname: "/inbox",
      title: "Assistant",
    },
    // {
    //   icon: "HardDrive",
    //   pathname: "/dashboard/file-manager",
    //   title: "File Manager",
    // },
    {
      icon: "Calendar",
      pathname: "/calendar",
      title: "Calendar",
    },
    "divider",
    {
      icon: "Users",
      title: "Users",
      pathname: "/users-layout-2",
    },
   
  /* {
      icon: "Database",
      pathname: "/database-manager",
      title: "Database Manager",
    }, {
      icon: "Trello",
      title: "Profile",
      pathname: "/dashboard/profile-overview-1",
      
    }
    ,
  */
  "divider",
];

export default menu;