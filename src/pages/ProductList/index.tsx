import React, { useState, useEffect } from "react";
import { RefreshCw, ArrowLeft } from "lucide-react";
import "tailwindcss/tailwind.css";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Import the CSS for the date picker
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { saveAs } from 'file-saver';

const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Delivery {
  orderId: string;
  cost: number;
  createdOn: { seconds: number, nanoseconds: number }; // Updated to match Firestore timestamp structure
  dateDelivery: string;
  timeDelivery: string;
  deliveryPerson: string;
  dropOffAddress: string;
  pickupLocation: string;
  recipientName: string;
}

const DatePickerComponent = DatePicker as any;

const Deliveries = () => {
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const deliveriesSnapshot = await getDocs(collection(db, "companies/010/deliveries"));
        const deliveriesList: Delivery[] = [];
        deliveriesSnapshot.forEach((doc) => {
          deliveriesList.push({ orderId: doc.id, ...doc.data() } as Delivery);
        });

        // Sort deliveries by createdOn in descending order
        deliveriesList.sort((a, b) => {
          const dateA = new Date(a.createdOn.seconds * 1000 + a.createdOn.nanoseconds / 1000000);
          const dateB = new Date(b.createdOn.seconds * 1000 + b.createdOn.nanoseconds / 1000000);
          return dateB.getTime() - dateA.getTime();
        });

        // Filter deliveries based on date range
        const filteredDeliveries = dateRange[0] && dateRange[1]
          ? deliveriesList.filter(delivery => {
              const deliveryDate = new Date(delivery.dateDelivery);
              return dateRange[0] && dateRange[1] && deliveryDate >= dateRange[0] && deliveryDate <= dateRange[1];
            })
          : deliveriesList;

        setDeliveriesData(filteredDeliveries);
      } catch (error) {
        console.error("Error fetching deliveries data:", error);
      }
    };

    fetchDeliveries();
  }, [dateRange]);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
  };

  const exportToCSV = () => {
    const startDate = dateRange[0] ? formatDate(dateRange[0]) : 'undefined';
    const endDate = dateRange[1] ? formatDate(dateRange[1]) : 'undefined';

    const headers = ["Order ID", "Cost", "Created On", "Delivery Date", "Time", "Delivery Person", "Drop-Off Address", "Pickup Location", "Recipient Name"];
    const rows = deliveriesData.map(delivery => [
      delivery.orderId,
      delivery.cost,
      new Date(delivery.createdOn.seconds * 1000).toLocaleString(),
      delivery.dateDelivery,
      delivery.timeDelivery,
      delivery.deliveryPerson,
      delivery.dropOffAddress,
      delivery.pickupLocation,
      delivery.recipientName
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const fileName = `deliveries-${startDate}_to_${endDate}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, fileName);
  };

  const renderDeliveriesTable = () => (
    <div className="max-w-full overflow-x-auto shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">Order ID</th>
            <th scope="col" className="px-6 py-3">Cost</th>
            <th scope="col" className="px-6 py-3">Created On</th>
            <th scope="col" className="px-6 py-3">Delivery Date</th>
            <th scope="col" className="px-6 py-3">Time</th>
            <th scope="col" className="px-6 py-3">Delivery Person</th>
            <th scope="col" className="px-6 py-3">Drop-Off Address</th>
            <th scope="col" className="px-6 py-3">Pickup Location</th>
            <th scope="col" className="px-6 py-3">Recipient Name</th>
          </tr>
        </thead>
        <tbody>
          {deliveriesData.map((delivery, index) => (
            <tr
              key={delivery.orderId}
              className={`${
                index % 2 === 0 ? "bg-white" : "bg-gray-50"
              } border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600`}
            >
              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                {delivery.orderId}
              </td>
              <td className="px-6 py-4">{delivery.cost}</td>
              <td className="px-6 py-4">{new Date(delivery.createdOn.seconds * 1000).toLocaleString()}</td>
              <td className="px-6 py-4">{delivery.dateDelivery}</td>
              <td className="px-6 py-4">{delivery.timeDelivery}</td>
              <td className="px-6 py-4">{delivery.deliveryPerson}</td>
              <td className="px-6 py-4">{delivery.dropOffAddress}</td>
              <td className="px-6 py-4">{delivery.pickupLocation}</td>
              <td className="px-6 py-4">{delivery.recipientName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="text-lg font-semibold pt-4 pb-4 pl-6 pr-6">Deliveries</div>
      <div className="flex space-x-4 justify-center items-center mb-4">
        <DatePickerComponent
          selected={dateRange[0]}
          onChange={(date: Date | null) => setDateRange([date, dateRange[1]])}
          selectsStart
          startDate={dateRange[0] ?? undefined}
          endDate={dateRange[1] ?? undefined}
          isClearable
          placeholderText="Start Date"
          className="bg-white rounded"
        />
        <DatePickerComponent
          selected={dateRange[1]}
          onChange={(date: Date | null) => setDateRange([dateRange[0], date])}
          selectsEnd
          startDate={dateRange[0] ?? undefined}
          endDate={dateRange[1] ?? undefined}
          minDate={dateRange[0] ?? undefined}
          isClearable
          placeholderText="End Date"
          className="bg-white rounded"
        />
        <button onClick={exportToCSV} className="p-2 bg-blue-500 text-white rounded">Export to CSV</button>
      </div>
      <div className="p-4">{renderDeliveriesTable()}</div>
    </>
  );
};

export default Deliveries;