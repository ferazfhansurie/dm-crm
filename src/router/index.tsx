import { Navigate, useLocation, useRoutes } from "react-router-dom";
import DashboardOverview1 from "../pages/DashboardOverview1";
import DashboardOverview2 from "../pages/DashboardOverview2";
import DashboardOverview3 from "../pages/DashboardOverview3";
import DashboardOverview4 from "../pages/DashboardOverview4";
import Categories from "../pages/Categories";
import ProductList from "../pages/ProductList";
import ProductGrid from "../pages/ProductGrid";
import TransactionList from "../pages/TransactionList";
import TransactionDetail from "../pages/TransactionDetail";
import SellerList from "../pages/SellerList";
import SellerDetail from "../pages/SellerDetail";
import Reviews from "../pages/Reviews";
import Inbox from "../pages/Inbox";
import FileManager from "../pages/FileManager";
import PointOfSale from "../pages/PointOfSale";
import Chat from "../pages/Chat";
import Post from "../pages/Post";
import Calendar from "../pages/Calendar";
import CrudDataList from "../pages/CrudDataList";
import CrudForm from "../pages/CrudForm";
import UsersLayout1 from "../pages/UsersLayout1";
import UsersLayout2 from "../pages/UsersLayout2";
import UsersLayout3 from "../pages/UsersLayout3";
import ProfileOverview1 from "../pages/ProfileOverview1";
import ProfileOverview2 from "../pages/ProfileOverview2";
import ProfileOverview3 from "../pages/ProfileOverview3";
import WizardLayout1 from "../pages/WizardLayout1";
import WizardLayout2 from "../pages/WizardLayout2";
import WizardLayout3 from "../pages/WizardLayout3";
import BlogLayout1 from "../pages/BlogLayout1";
import BlogLayout2 from "../pages/BlogLayout2";
import BlogLayout3 from "../pages/BlogLayout3";
import PricingLayout1 from "../pages/PricingLayout1";
import PricingLayout2 from "../pages/PricingLayout2";
import InvoiceLayout1 from "../pages/InvoiceLayout1";
import InvoiceLayout2 from "../pages/InvoiceLayout2";
import FaqLayout1 from "../pages/FaqLayout1";
import FaqLayout2 from "../pages/FaqLayout2";
import FaqLayout3 from "../pages/FaqLayout3";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ErrorPage from "../pages/ErrorPage";
import UpdateProfile from "../pages/UpdateProfile";
import ChangePassword from "../pages/ChangePassword";
import RegularTable from "../pages/RegularTable";
import Tabulator from "../pages/Tabulator";
import Modal from "../pages/Modal";
import Slideover from "../pages/Slideover";
import Notification from "../pages/Notification";
import Tab from "../pages/Tab";
import Accordion from "../pages/Accordion";
import Button from "../pages/Button";
import ProgressBar from "../pages/ProgressBar";
import Tooltip from "../pages/Tooltip";
import Dropdown from "../pages/Dropdown";
import Typography from "../pages/Typography";
import Icon from "../pages/Icon";
import LoadingIcon from "../pages/LoadingPage";
import LoadingIcon2 from "../pages/LoadingPage2";
import RegularForm from "../pages/RegularForm";
import Datepicker from "../pages/Datepicker";
import FileUpload from "../pages/FileUpload";
import WysiwygEditor from "../pages/WysiwygEditor";
import Validation from "../pages/Validation";
import Chart from "../pages/Chart";
import Slider from "../pages/Slider";
import ImageZoom from "../pages/ImageZoom";
import Opportunities from "../pages/Opportunities";
import QuickReplies from "../pages/QuickReplies";
import Automations from "../pages/Automations";
import Builder from "../pages/Builder";
import FollowUps from "../pages/FollowUps";
import OldFollowUps from "../pages/FollowUpsOld";
import SelectFollowUpMode from "../pages/FollowUpsSelect";
import BlastHistory from "../pages/BlastHistory"
import Layout from "../themes";
import { getAuth } from "firebase/auth";
import { useState, useEffect } from "react";
import AIResponses from "../pages/AIResponses";
import StoragePricing from "../pages/StoragePricing";
import { ContactsProvider, useContacts } from "../contact"; // Adjust the path as needed
import DatabaseManager from "../pages/DatabaseManager";
import AIGenerativeResponses from "../pages/AIGenerativeResponses";
import Ticket from "../pages/Ticket";
import PublicTaskForm from "../pages/PublicTaskForm";
import Settings from "../pages/Settings";
import ScheduledMessages from "../pages/ScheduledMessages";
import AppointmentRequests from "../pages/AppointmentRequests";
import GuestChat from "../pages/GuestChat";

function Router() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const auth = getAuth();
  const { isLoading } = useContacts();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, [auth]);

  const routes = [
    {
      path: "/",
      element:(
        <div className="h-screen flex flex-col">
          <Layout />
        </div>
      ),
      children: [
        { path: "/", element: <Chat /> },
        { path: "chat", element: <Chat /> },
        { path: "/dashboard", element: <DashboardOverview1 /> },
        { path: "ticket", element: <Ticket /> },
        { path: "crud-form", element: <CrudForm /> },
        { path: "settings", element: <Settings /> },
        { path: "quick-replies", element: <QuickReplies /> },
        { path: "a-i-responses", element: <AIResponses /> },
        { path: "automations", element: <Automations /> },
        { path: "follow-ups", element: <FollowUps /> },
        { path: "follow-ups-select", element: <SelectFollowUpMode /> },
        { path: "follow-ups-old", element: <OldFollowUps /> },
        { path: "a-i-generative-responses", element: <AIGenerativeResponses /> },
        { path: "storage-pricing", element: <StoragePricing /> },
        { path: "/client-ticket", element: <PublicTaskForm /> },
        {path: "/loading2", element: <LoadingIcon2 />},
        { path: "opportunities", element: <Opportunities /> },
        { path: "appointment-requests", element: <AppointmentRequests /> },
        { path: "scheduled-messages", element: <ScheduledMessages /> },

        {
          path: "/database-manager",
          element: <DatabaseManager />
        },
        { path: "/dashboard/blast-history", element: <BlastHistory /> },
        { path: "users-layout-2/quick-replies", element: <QuickReplies /> },
        { path: "users-layout-2/settings", element: <Settings /> },
        { path: "users-layout-2/automations", element: <Automations /> },
        { path: "users-layout-2/follow-ups", element: <FollowUps /> },
        { path: "users-layout-2/follow-ups-select", element: <SelectFollowUpMode /> },
        { path: "users-layout-2/follow-ups-old", element: <OldFollowUps /> },
        { path: "users-layout-2/a-i-responses", element: <AIResponses /> },
        { path: "users-layout-2/a-i-generative-responses", element: <AIGenerativeResponses /> },
        { path: "users-layout-2/builder", element: <Builder /> },
        { path: "users-layout-2/storage-pricing", element: <StoragePricing /> },
        { path: "dashboard-overview-3", element: <DashboardOverview3 /> },
        { path: "dashboard-overview-4", element: <DashboardOverview4 /> },
        { path: "profile", element: <ProfileOverview1 /> },
        { path: "categories", element: <Categories /> },
        { path: "transaction-list", element: <TransactionList /> },
        { path: "transaction-detail", element: <TransactionDetail /> },
        { path: "seller-list", element: <SellerList /> },
        { path: "seller-detail", element: <SellerDetail /> },
        { path: "reviews", element: <Reviews /> },
        { path: "inbox", element: <Inbox /> },
        { path: "file-manager", element: <FileManager /> },
        { path: "point-of-sale", element: <PointOfSale /> },
        { path: "chat", element: <Chat /> },
        { path: "post", element: <Post /> },
        { path: "calendar", element: <Calendar /> },
        { path: "crud-data-list", element: <CrudDataList /> },
        { path: "users-layout-2/crud-form", element: <CrudForm /> },
        { path: "users-layout-1", element: <UsersLayout1 /> },
        { path: "users-layout-2", element: <UsersLayout2 /> },
        { path: "users-layout-3", element: <UsersLayout3 /> },
        { path: "profile-overview-1", element: <ProfileOverview1 /> },
        { path: "profile-overview-2", element: <ProfileOverview2 /> },
        { path: "profile-overview-3", element: <ProfileOverview3 /> },
        { path: "wizard-layout-1", element: <WizardLayout1 /> },
        { path: "wizard-layout-2", element: <WizardLayout2 /> },
        { path: "wizard-layout-3", element: <WizardLayout3 /> },
        { path: "blog-layout-1", element: <BlogLayout1 /> },
        { path: "blog-layout-2", element: <BlogLayout2 /> },
        { path: "blog-layout-3", element: <BlogLayout3 /> },
        { path: "pricing-layout-1", element: <PricingLayout1 /> },
        { path: "pricing-layout-2", element: <PricingLayout2 /> },
        { path: "invoice-layout-1", element: <InvoiceLayout1 /> },
        { path: "invoice-layout-2", element: <InvoiceLayout2 /> },
        { path: "faq-layout-1", element: <FaqLayout1 /> },
        { path: "faq-layout-2", element: <FaqLayout2 /> },
        { path: "faq-layout-3", element: <FaqLayout3 /> },
        { path: "update-profile", element: <UpdateProfile /> },
        { path: "change-password", element: <ChangePassword /> },
        { path: "regular-table", element: <RegularTable /> },
        { path: "tabulator", element: <Tabulator /> },
        { path: "modal", element: <Modal /> },
        { path: "slideover", element: <Slideover /> },
        { path: "tab", element: <Tab /> },
        { path: "accordion", element: <Accordion /> },
        { path: "button", element: <Button /> },
        { path: "progress-bar", element: <ProgressBar /> },
        { path: "tooltip", element: <Tooltip /> },
        { path: "dropdown", element: <Dropdown /> },
        { path: "typography", element: <Typography /> },
        { path: "icon", element: <Icon /> },
        { path: "regular-form", element: <RegularForm /> },
        { path: "datepicker", element: <Datepicker /> },
        { path: "file-upload", element: <FileUpload /> },
        { path: "wysiwyg-editor", element: <WysiwygEditor /> },
        { path: "validation", element: <Validation /> },
        { path: "chart", element: <Chart /> },
        { path: "slider", element: <Slider /> },
        { path: "image-zoom", element: <ImageZoom /> },
        { path: "opp", element: <Opportunities /> },
        { path: "users-layout-2/loading2", element: <LoadingIcon2 /> },
        { path: "dashboard-overview-2", element: <DashboardOverview2 /> },
        { path: "product-list", element: <ProductList /> },
        { path: "product-grid", element: <ProductGrid /> },
      ],
    },
    { path: "/guest-chat/:companyId", element: <GuestChat />},
    { path: "notification", element: <Notification /> },
    { path: "dashboard-overview-2", element: <DashboardOverview2 /> },
    { path: "loading", element:<LoadingIcon />  },
    { path: "product-list", element: <ProductList /> },
    { path: "product-grid", element: <ProductGrid /> },
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
   
    { path: "/error-page", element: <ErrorPage /> },
    { path: "*", element: <ErrorPage /> },
  ];
  if (isLoading) {
    return <LoadingIcon />;
  }
  return useRoutes(routes);
}

export default Router;