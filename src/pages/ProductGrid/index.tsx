import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc,setDoc } from "firebase/firestore";
import { Dialog, Transition } from '@headlessui/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Edit, Save, Delete, PlusCircle, RefreshCw, Truck } from 'lucide-react';
import clsx from "clsx";
import 'tailwindcss/tailwind.css';
import { initializeApp } from "firebase/app";
import { getFirestore, Timestamp } from "firebase/firestore";
import DatePicker from 'react-datepicker';
import { startOfDay, endOfDay, subDays } from 'date-fns';

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

interface PieSelection {
  pie: string;
  size: string;
  quantity: number;
  remarks: string;
}


interface Order {
  id: string;
  createdDate: string;
  name: string;
  phoneNumber: string; // Add phoneNumber field
  pies: PieSelection[];
  type: string;
  remarks: string;
  status: string;
  madeDate?: string;
  requiredDate?: string;
}


interface DeliveryForm {
  cost: string;
  createdOn: Timestamp | null;
  dateDelivery?: string;
  deliveryPerson: string;
  dropOffAddress: string;
  orderId: string;
  pickupLocation: string;
  recipientName: string;
  timeDelivery?: string;
}
interface Material{
  id:string;
  name:string;
}

const DatePickerComponent = DatePicker as any;

const Orders = () => {
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [draftOrders, setDraftOrders] = useState<Order[]>([]);
const [submittedOrders, setSubmittedOrders] = useState<Order[]>([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [materialsData, setMaterialsData] = useState<Material[]>([]);
  const [newOrder, setNewOrder] = useState<Order>({
    id: '',
    createdDate: new Date().toISOString().split('T')[0], // Set the created date to the current date
    name: '',
    phoneNumber:'',
    pies: [{ pie: '', size: '', quantity: 0, remarks: '' }],
    type: '',
    remarks: '',
    status: 'Pending',
    madeDate: '',
    requiredDate: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Order>>({
    pies: [{ pie: '', size: '', quantity: 0,remarks:'' }]
  });
  const [openDeliveryDialog, setOpenDeliveryDialog] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [deliveryFormData, setDeliveryFormData] = useState<DeliveryForm>({
    cost: '',
    createdOn: null,
    dateDelivery: '',
    deliveryPerson: '',
    dropOffAddress: '',
    orderId: '',
    pickupLocation: 'Taman Tun Dr Ismail',
    recipientName: '',
    timeDelivery: '',
  });
  const fetchMaterials = async () => {
    try {
      const materialsSnapshot = await getDocs(collection(db, "companies/010/materials"));
      const materialsList: Material[] = [];
      materialsSnapshot.forEach((doc) => {
        materialsList.push({ id: doc.id, ...doc.data() } as Material);
      });
      setMaterialsData(materialsList);
    } catch (error) {
      console.error('Error fetching materials data:', error);
    }
  };
  const handleOpenEditDialog = (order: Order) => {
    setEditingOrder(order);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingOrder(null);
  };
  const fetchOrders = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, "companies/010/orders"));
      const draftList: Order[] = [];
      const submittedList: Order[] = [];
      
      ordersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data && Array.isArray(data.pies)) {
          if (data.status === 'Draft') {
            draftList.push({ id: doc.id, ...data } as Order);
          } else {
            submittedList.push({ id: doc.id, ...data } as Order);
          }
        }
      });
  
      
      
  
      const applyFilters = (orders: Order[]) => {
        return orders.filter(order => {
          const orderDate = new Date(order.createdDate);
          const isValidDate = orderDate instanceof Date && !isNaN(orderDate.getTime());
          const dateInRange = (dateRange[0] && dateRange[1]) ? (isValidDate && orderDate >= dateRange[0] && orderDate <= dateRange[1]) : true;
          const matchesSearchTerm = order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     order.pies.some(pie => pie.pie.toLowerCase().includes(searchTerm.toLowerCase()));
          return dateInRange && matchesSearchTerm;
        }).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
      };
  
      setDraftOrders(applyFilters(draftList));
      setSubmittedOrders(applyFilters(submittedList));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  

  useEffect(() => {
    fetchOrders();
    fetchMaterials();
  }, [dateRange, searchTerm]);

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setNewOrder({
      id: '',
      createdDate: '',
      phoneNumber:'',
      name: '',
      pies: [{ pie: '', size: '', quantity: 0,remarks:'' }],
      type: '',
      remarks: '',
      status: 'Pending'
    });
  };

  const handleOpenDeliveryDialog = (order: Order) => {
    setOpenDeliveryDialog(true);
    setDeliveryFormData(prevState => ({
      ...prevState,
      recipientName: order.name,
      orderId: order.id,
    }));
  };

  const fetchDeliveryCost = async (order: DeliveryForm): Promise<number> => {
    try {
      const response = await fetch('https://hook.us1.make.com/gcvur3ypeelh5yrg5dtc13ddc7ulhzji', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: order.dropOffAddress ,pickup:order.pickupLocation}),
      });
      const data = await response.json();
      return parseFloat(data);
    } catch (error) {
      console.error('Error fetching delivery cost:', error);
      return 0;
    }
  };

  const handleCloseDeliveryDialog = async () => {
    try {
      const tempcost = await fetchDeliveryCost(deliveryFormData);
      const cost = tempcost / 1000;
      await addDoc(collection(db, "companies/010/deliveries"), { ...deliveryFormData, cost, createdOn: Timestamp.now() });
  
      // Update the order status to indicate it has been added to delivery
      const orderRef = doc(db, `companies/010/orders/${deliveryFormData.orderId}`);
      await updateDoc(orderRef, { status: 'Delivered' });
  
      setOpenDeliveryDialog(false);
      setDeliveryFormData({
        cost: '',
        createdOn: null,
        dateDelivery: '',
        deliveryPerson: '',
        dropOffAddress: '',
        orderId: '',
        pickupLocation: 'Taman Tun Dr Ismail',
        recipientName: '',
        timeDelivery: '',
      });
      fetchOrders();
    } catch (error) {
      console.error('Error submitting delivery information:', error);
    }
  };
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewOrder(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const handlePiesChange = (index: number, field: string, value: string | number) => {
    const updatedPies = [...newOrder.pies];
    updatedPies[index] = { ...updatedPies[index], [field]: value };
    setNewOrder(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  const submitDraftOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, `companies/010/orders/${orderId}`);
      await updateDoc(orderRef, { status: 'Submitted' });
      fetchOrders();
    } catch (error) {
      console.error('Error submitting drafted order:', error);
    }
  };
  
  const handleEditPiesChange = (index: number, field: string, value: string | number) => {
    const updatedPies = [...(editFormData.pies || [])];
    updatedPies[index] = { ...updatedPies[index], [field]: value };
    setEditFormData(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };
  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDeliveryFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const addPie = () => {
    setNewOrder(prevState => ({
      ...prevState,
      pies: [...prevState.pies, { pie: '', size: '', quantity: 0,remarks:'' }]
    }));
  };

  const addEditPie = () => {
    setEditFormData(prevState => ({
      ...prevState,
      pies: [...(prevState.pies || []), { pie: '', size: '', quantity: 0 ,remarks:''}]
    }));
  };

  const removePie = (index: number) => {
    const updatedPies = newOrder.pies.filter((_, i) => i !== index);
    setNewOrder(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const removeEditPie = (index: number) => {
    const updatedPies = (editFormData.pies || []).filter((_, i) => i !== index);
    setEditFormData(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const submitNewOrder = async (isDraft: boolean) => {
    try {
      const lastSixDigits = newOrder.phoneNumber.slice(-6);
      const currentDate = new Date().toLocaleDateString('en-GB').split('/').reverse().join(''); // Format as yymmdd
      const orderId = `${lastSixDigits}${currentDate}`;
  
      const orderData = {
        ...newOrder,
        id: orderId, // Set the order ID
        status: isDraft ? 'Draft' : 'Submitted',
        createdDate: new Date().toISOString().split('T')[0], // Set the created date to the current date
      };
  
      // Use setDoc with the specific document ID
      await setDoc(doc(db, "companies/010/orders", orderId), orderData);
      fetchOrders();
      handleCloseAddDialog();
    } catch (error) {
      console.error('Error submitting new order:', error);
    }
  };
  
  
  

  const startEdit = (order: Order) => {
    setEditingId(order.id);
    setEditFormData(order);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = async () => {
    try {
      const orderRef = doc(db, `companies/010/orders/${editingId}`);
      await updateDoc(orderRef, editFormData);
      setEditingId(null);
      fetchOrders();
    } catch (error) {
      console.error('Error saving order edits:', error);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const orderRef = doc(db, `companies/010/orders/${id}`);
      await deleteDoc(orderRef);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };
 
  const renderOrdersTable = (orders: Order[], isDraft: boolean) => (
    <div className="max-w-full overflow-x-auto shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">Order ID</th>
            <th scope="col" className="px-6 py-3">Created Date</th>
            <th scope="col" className="px-6 py-3">Made Date</th>
            <th scope="col" className="px-6 py-3">Required Date</th>
            <th scope="col" className="px-6 py-3">Name</th>
            <th scope="col" className="px-6 py-3">Phone Number</th>
            <th scope="col" className="px-6 py-3">Pies</th>
            <th scope="col" className="px-6 py-3">Delivery</th>
            <th scope="col" className="px-6 py-3">Remarks</th>
            <th scope="col" className="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr
              key={order.id}
              className={clsx(index % 2 === 0 ? 'bg-white' : 'bg-gray-50', 'border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600')}
            >
              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{order.id}</td>
              <td className="px-6 py-4">{order.createdDate}</td>
              <td className="px-6 py-4">{order.madeDate}</td>
              <td className="px-6 py-4">{order.requiredDate}</td>
              <td className="px-6 py-4">{order.name}</td>
              <td className="px-6 py-4">{order.phoneNumber}</td>
              <td className="px-6 py-4">
                <div>
                  {order.pies.map((pie, pieIndex) => (
                    <div key={pieIndex}>
                      <span>{pie.pie} - {pie.size} - {pie.quantity} - {pie.remarks}</span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4">{order.type}</td>
              <td className="px-6 py-4">{order.remarks}</td>
              <td className="px-6 py-4 flex space-x-2">
                <button onClick={() => handleOpenEditDialog(order)} className="p-2 text-blue-600">
                  <Edit />
                </button>
                <button onClick={() => deleteOrder(order.id)} className="p-2 text-red-600">
                  <Delete />
                </button>
                {!isDraft && order.status !== 'Delivered' && (
                  <button onClick={() => handleOpenDeliveryDialog(order)} className="p-2 text-blue-600">
                    <Truck />
                  </button>
                )}
                {isDraft && (
                  <button onClick={() => submitDraftOrder(order.id)} className="p-2 text-green-600">
                    <Save />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  
  
  const handleDateChange = (name: string, date: Date | null) => {
    setNewOrder(prevState => ({
      ...prevState,
      [name]: date ? date.toISOString().split('T')[0] : ''
    }));
  };
  const handleSaveEdit = async (updatedOrder: Partial<Order>) => {
    if (!editingOrder) return;

    try {
      const orderRef = doc(db, `companies/010/orders/${editingOrder.id}`);
      await updateDoc(orderRef, updatedOrder);
      setOpenEditDialog(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error saving order edits:', error);
    }
  };
  return (
    <>
      <ToastContainer />
      <div className="flex flex-wrap items-center col-span-12 mt-2 intro-y sm:flex-nowrap pt-4 pb-4 pl-6 pr-6">
      <input
    type="text"
    placeholder="Search Orders"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="p-2 m-2 border rounded"
  />
        <div className="flex space-x-2 ml-auto">
          <button onClick={handleOpenAddDialog} className="p-2 m-2 !box">
            <PlusCircle />
          </button>
        </div>
      </div>
      <EditOrderModal
  order={editingOrder}
  isOpen={openEditDialog}
  onClose={handleCloseEditDialog}
  onSave={handleSaveEdit}
  materialsData={materialsData}
/>
      <Transition show={openAddDialog} as={React.Fragment}>
  <Dialog onClose={handleCloseAddDialog} className="fixed inset-0 z-10 overflow-y-auto">
    <div className="min-h-screen px-4 text-center">
      <Transition.Child
        as={React.Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
      </Transition.Child>
      <span className="inline-block h-screen align-middle" aria-hidden="true">
        &#8203;
      </span>
      <Transition.Child
        as={React.Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div className="inline-block w-full max-w-4xl h-auto p-10 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
            Add New Order
          </Dialog.Title>
          <div className="mt-2">
            <div className="flex space-x-2">
              <DatePickerComponent
                selected={newOrder.madeDate ? new Date(newOrder.madeDate) : null}
                onChange={(date: Date) => handleDateChange('madeDate', date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Made Date"
                className="border p-2 rounded"
              />
              <DatePickerComponent
                selected={newOrder.requiredDate ? new Date(newOrder.requiredDate) : null}
                onChange={(date: Date) => handleDateChange('requiredDate', date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Required Date"
                className="border p-2 rounded"
              />
            </div>
            <div className="flex space-x-2 mt-2">
              <input
                type="text"
                name="name"
                placeholder="Name"
                onChange={handleChange}
                className="w-1/3 border p-2 rounded"
              />
              <input
                type="text"
                name="phoneNumber"
                placeholder="Phone Number"
                onChange={handleChange}
                className="w-1/3 border p-2 rounded"
              />
              <select
                name="type"
                onChange={handleChange}
                className="w-1/3 border p-2 rounded"
              >
                <option value="Delivery">Delivery</option>
                <option value="Pick Up">Pick Up</option>
              </select>
            </div>
            <div className="mt-2">
              <input
                type="text"
                name="remarks"
                placeholder="Remarks"
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="mt-2">
  {newOrder.pies.map((pie, index) => (
    <div key={index} className="flex space-x-2 mt-2">
      <select
        name={`pie-${index}`}
        onChange={(e) => handlePiesChange(index, 'pie', e.target.value)}
        className="w-1/4 border p-2 rounded"
        value={pie.pie}
      >
        <option value="">Select Pie</option>
        {materialsData.map((material) => (
          <option key={material.id} value={material.name}>{material.name}</option>
        ))}
      </select>
      <select
        name={`size-${index}`}
        onChange={(e) => handlePiesChange(index, 'size', e.target.value)}
        className="w-1/4 border p-2 rounded"
        value={pie.size}
      >
        <option value="">Select Size</option>
        <option value="Regular 5+” (4-5 servings)">Regular 5+” (4-5 servings)</option>
        <option value="Medium 7+” (7-9 servings)">Medium 7+” (7-9 servings)</option>
        <option value="Large 9+” (12-14 servings)">Large 9+” (12-14 servings)</option>
      </select>
      <input
        type="number"
        name={`quantity-${index}`}
        onChange={(e) => handlePiesChange(index, 'quantity', parseInt(e.target.value))}
        placeholder="Quantity"
        className="w-1/6 border p-2 rounded"
        value={pie.quantity}
      />
      <input
        type="text"
        name={`remarks-${index}`}
        onChange={(e) => handlePiesChange(index, 'remarks', e.target.value)}
        placeholder="Remarks"
        className="w-1/4 border p-2 rounded"
        value={pie.remarks}
      />
      <button onClick={() => removePie(index)} className="p-2 text-red-600">
        <Delete />
      </button>
    </div>
  ))}
  <button onClick={addPie} className="mt-2 p-2 bg-blue-500 text-white rounded">
    Add Another Pie
  </button>
</div>

          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleCloseAddDialog}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submitNewOrder(true)}
              className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => submitNewOrder(false)}
              className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Submit Order
            </button>
          </div>
        </div>
      </Transition.Child>
    </div>
  </Dialog>
</Transition>
<Transition show={openDeliveryDialog} as={React.Fragment}>
  <Dialog onClose={() => setOpenDeliveryDialog(false)} className="fixed inset-0 z-10 overflow-y-auto">
    <div className="min-h-screen px-4 text-center">
      <Transition.Child
        as={React.Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
      </Transition.Child>
      <span className="inline-block h-screen align-middle" aria-hidden="true">
        &#8203;
      </span>
      <Transition.Child
        as={React.Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
            Add to Delivery
          </Dialog.Title>
          <div className="mt-2">
            <input
              type="text"
              name="recipientName"
              placeholder="Recipient Name"
              onChange={handleDeliveryChange}
              value={deliveryFormData.recipientName}
              className="w-full mt-2 border p-2 rounded"
            />
            <input
              type="text"
              name="dropOffAddress"
              placeholder="Drop Off Address"
              onChange={handleDeliveryChange}
              value={deliveryFormData.dropOffAddress}
              className="w-full mt-2 border p-2 rounded"
            />
            <div className="mt-2 flex flex-col">
              <label className="text-sm text-gray-600">Time Delivery (Optional)</label>
              <input
                type="time"
                name="timeDelivery"
                placeholder="Time Delivery"
                onChange={handleDeliveryChange}
                value={deliveryFormData.timeDelivery || ''}
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="mt-2 flex flex-col">
              <label className="text-sm text-gray-600">Date Delivery (Optional)</label>
              <input
                type="date"
                name="dateDelivery"
                placeholder="Date Delivery"
                onChange={handleDeliveryChange}
                value={deliveryFormData.dateDelivery || ''}
                className="w-full border p-2 rounded"
              />
            </div>
            <input
              type="text"
              name="deliveryPerson"
              placeholder="Delivery Person"
              onChange={handleDeliveryChange}
              value={deliveryFormData.deliveryPerson}
              className="w-full mt-2 border p-2 rounded"
            />
            <input
              type="text"
              name="pickupLocation"
              placeholder="Pickup Location"
              onChange={handleDeliveryChange}
              value={deliveryFormData.pickupLocation}
              className="w-full mt-2 border p-2 rounded"
            />
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setOpenDeliveryDialog(false)}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCloseDeliveryDialog}
              className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Submit
            </button>
          </div>
        </div>
      </Transition.Child>
    </div>
  </Dialog>
</Transition>


      <div className="flex space-x-4 justify-center items-center mb-4">
      <div className="flex space-x-4 justify-center items-center mb-4">
  <DatePickerComponent
    selected={dateRange[0]}
    onChange={(date: Date | null) => setDateRange([date, dateRange[1]])}
    selectsStart
    startDate={dateRange[0]}
    endDate={dateRange[1]}
    isClearable
    placeholderText="Start Date"
    className="bg-white rounded"
  />
  <DatePickerComponent
    selected={dateRange[1]}
    onChange={(date: Date | null) => setDateRange([dateRange[0], date])}
    selectsEnd
    startDate={dateRange[0]}
    endDate={dateRange[1]}
    minDate={dateRange[0]}
    isClearable
    placeholderText="End Date"
    className="bg-white rounded"
  />
</div>
      </div>
      <div className="text-lg font-semibold p-5">Drafted</div>
      <div className="p-4">
      {renderOrdersTable(draftOrders,true)}
      </div>
      <div className="text-lg font-semibold p-5">Submitted</div>
      <div className="p-4">
      {renderOrdersTable(submittedOrders,false)}
      </div>
    </>
  );
};
interface EditOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder: Partial<Order>) => void;
  materialsData: Material[]; // Add this line
}


const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, isOpen, onClose, onSave, materialsData }) => {
  const [editFormData, setEditFormData] = useState<Partial<Order>>({});
  useEffect(() => {
    setEditFormData(order || {});
  }, [order]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleEditPiesChange = (index: number, field: string, value: string | number) => {
    const updatedPies = [...(editFormData.pies || [])];
    updatedPies[index] = { ...updatedPies[index], [field]: value };
    setEditFormData(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const addEditPie = () => {
    setEditFormData(prevState => ({
      ...prevState,
      pies: [...(prevState.pies || []), { pie: '', size: '', quantity: 0, remarks: '' }]
    }));
  };

  const removeEditPie = (index: number) => {
    const updatedPies = (editFormData.pies || []).filter((_, i) => i !== index);
    setEditFormData(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog onClose={onClose} className="fixed inset-0 z-10 overflow-y-auto">
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>
          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-4xl p-10 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                Edit Order
              </Dialog.Title>
              <div className="mt-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={editFormData.name || ''}
                    onChange={handleEditChange}
                    className="w-1/3 border p-2 rounded"
                  />
                  <input
                    type="text"
                    name="phoneNumber"
                    placeholder="Phone Number"
                    value={editFormData.phoneNumber || ''}
                    onChange={handleEditChange}
                    className="w-1/3 border p-2 rounded"
                  />
                  <select
                    name="type"
                    value={editFormData.type || ''}
                    onChange={handleEditChange}
                    className="w-1/3 border p-2 rounded"
                  >
                    <option value="Delivery">Delivery</option>
                    <option value="Pick Up">Pick Up</option>
                  </select>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    name="remarks"
                    placeholder="Remarks"
                    value={editFormData.remarks || ''}
                    onChange={handleEditChange}
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div className="mt-2">
  {editFormData.pies?.map((pie, index) => (
    <div key={index} className="flex space-x-2 mt-2">
      <select
        name={`pie-${index}`}
        onChange={(e) => handleEditPiesChange(index, 'pie', e.target.value)}
        className="w-1/4 border p-2 rounded"
        value={pie.pie}
      >
        <option value="">Select Pie</option>
        {materialsData.map((material) => (
          <option key={material.id} value={material.name}>{material.name}</option>
        ))}
      </select>
      <select
        name={`size-${index}`}
        onChange={(e) => handleEditPiesChange(index, 'size', e.target.value)}
        className="w-1/4 border p-2 rounded"
        value={pie.size}
      >
        <option value="">Select Size</option>
        <option value="Regular 5+” (4-5 servings)">Regular 5+” (4-5 servings)</option>
        <option value="Medium 7+” (7-9 servings)">Medium 7+” (7-9 servings)</option>
        <option value="Large 9+” (12-14 servings)">Large 9+” (12-14 servings)</option>
      </select>
      <input
        type="number"
        name={`quantity-${index}`}
        onChange={(e) => handleEditPiesChange(index, 'quantity', parseInt(e.target.value))}
        placeholder="Quantity"
        className="w-1/6 border p-2 rounded"
        value={pie.quantity}
      />
      <input
        type="text"
        name={`remarks-${index}`}
        onChange={(e) => handleEditPiesChange(index, 'remarks', e.target.value)}
        placeholder="Remarks"
        className="w-1/4 border p-2 rounded"
        value={pie.remarks}
      />
      <button onClick={() => removeEditPie(index)} className="p-2 text-red-600">
        <Delete />
      </button>
    </div>
  ))}
  <button onClick={addEditPie} className="mt-2 p-2 bg-blue-500 text-white rounded">
    Add Another Pie
  </button>
</div>

              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSave(editFormData)}
                  className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};
export default Orders;