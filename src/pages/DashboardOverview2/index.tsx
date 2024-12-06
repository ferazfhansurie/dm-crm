import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc,deleteDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import clsx from "clsx";
import TinySlider, { TinySliderElement } from "@/components/Base/TinySlider";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, PlusCircle, Save, Delete } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
}

interface Order {
  id: string;
  date: string;
  name: string;
  pies: PieSelection[];
  type: string;
  remarks: string;
  status: string;
}

interface Material {
  id: string;
  name: string;
  apple?: MaterialSize;
  cinnamon?: MaterialSize;
  pineapple?: MaterialSize;
  blueberry?: MaterialSize;
  pecan?: MaterialSize;
  caramel?: MaterialSize;
  spice?: MaterialSize;
  sauce?: number;
}
interface MaterialSize {
  small: number;
  regular: number;
  large: number;
}

interface MaterialsNeeded {
  [pie: string]: {
    [ingredient: string]: number;
  };
}

const DatePickerComponent = DatePicker as any;

const Main = () => {
  const importantNotesRef = useRef<TinySliderElement>(null);
  const prevImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("prev");
  };
  const nextImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("next");
  };

  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [materialsData, setMaterialsData] = useState<Material[]>([]);
  const [materialsNeeded, setMaterialsNeeded] = useState<MaterialsNeeded>({});
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditMaterialsDialog, setOpenEditMaterialsDialog] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [newOrder, setNewOrder] = useState<Order>({
    id: '',
    date: '',
    name: '',
    pies: [{ pie: '', size: '', quantity: 0 }],
    type: '',
    remarks: '',
    status: 'Pending'
  });
  const [dateRange, setDateRange] = useState([startOfDay(subDays(new Date(), 30)), endOfDay(new Date())]);
  const [newMaterial, setNewMaterial] = useState({ name: '' });
  const [openAddMaterialDialog, setOpenAddMaterialDialog] = useState(false);
  const [openDeletePiesDialog, setOpenDeletePiesDialog] = useState(false);

  const [materialFields, setMaterialFields] = useState<
  { name: string; small: number; regular: number; large: number }[]
>([{ name: '', small: 0, regular: 0, large: 0 }]);
  const handleNewMaterialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewMaterial(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  const handleOpenDeletePiesDialog = () => {
    setOpenDeletePiesDialog(true);
  };
  
  const handleCloseDeletePiesDialog = () => {
    setOpenDeletePiesDialog(false);
  };
  const DeletePiesDialog = () => {
    const deleteMaterial = async (materialId: string) => {
      try {
        await deleteDoc(doc(db, `companies/010/materials/${materialId}`));
        fetchData();
        handleCloseDeletePiesDialog();
      } catch (error) {
        console.error('Error deleting material:', error);
      }
    };
  
    const confirmDeleteMaterial = (materialId: string) => {
      if (window.confirm("Are you sure you want to delete this material?")) {
        deleteMaterial(materialId);
      }
    };
  
    return (
      <Transition show={openDeletePiesDialog} as={React.Fragment}>
        <Dialog onClose={handleCloseDeletePiesDialog} className="fixed inset-0 z-10 overflow-y-auto">
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
                  Delete Pies
                </Dialog.Title>
                <div className="mt-2">
                  <div className="overflow-x-auto rounded-lg shadow">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-800 text-white">
                        <tr>
                          <th className="w-1/2 px-4 py-2">Pie</th>
                          <th className="w-1/2 px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialsData.map(material => (
                          <tr key={material.id} className="bg-white">
                            <td className="border px-4 py-2">{material.name}</td>
                            <td className="border px-4 py-2">
                              <button onClick={() => confirmDeleteMaterial(material.id)} className="p-2 bg-red-500 text-white rounded">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleCloseDeletePiesDialog}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    );
  };
    
  const handleMaterialNameChange = (index: number, value: string) => {
    const updatedFields = [...materialFields];
    updatedFields[index].name = value;
    setMaterialFields(updatedFields);
  };
  
  const handleMaterialFieldChange = (index: number, size: keyof MaterialSize, value: number) => {
    const updatedFields = [...materialFields];
    updatedFields[index][size] = value;
    setMaterialFields(updatedFields);
  };
  const deleteMaterial = async (materialId: string) => {
    try {
      await deleteDoc(doc(db, `companies/010/materials/${materialId}`));
      fetchData();
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };
  const addMaterialField = () => {
    setMaterialFields(prevFields => [
      ...prevFields,
      { name: '', small: 0, regular: 0, large: 0 }
    ]);
  };
  
  const handleOpenAddMaterialDialog = () => {
    setOpenAddMaterialDialog(true);
  };
  
  const handleCloseAddMaterialDialog = () => {
    setOpenAddMaterialDialog(false);
    setNewMaterial({name: '' });
    setMaterialFields([{ name: '', small: 0, regular: 0, large: 0 }]);
  };
  const fetchData = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, "companies/010/orders"));
      const materialsSnapshot = await getDocs(collection(db, "companies/010/materials"));
  
      const ordersList: Order[] = [];
      ordersSnapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() } as Order);
      });
  
      const materialsList: Material[] = [];
      materialsSnapshot.forEach((doc) => {
        materialsList.push({ id: doc.id, ...doc.data() } as Material);
      });
  
      setOrdersData(ordersList);
      setMaterialsData(materialsList);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    const calculateMaterialsNeeded = () => {
      if (ordersData.length === 0 || materialsData.length === 0) {
        return;
      }
  
      const updatedMaterialsNeeded: MaterialsNeeded = {};
  
      ordersData.forEach(order => {
        const { pies } = order;
        pies.forEach(pieSelection => {
          const { pie, size, quantity } = pieSelection;
  
          materialsData.forEach(material => {
            if (material.name === pie) {
              Object.keys(material).forEach(ingredient => {
                if (ingredient !== 'id' && ingredient !== 'name') {
                  const materialIngredient = material[ingredient as keyof Material];
                  if (materialIngredient && typeof materialIngredient === 'object') {
                    let quantityForIngredient = 0;
                    if (size === "Regular 5+” (4-5 servings)") {
                      quantityForIngredient = materialIngredient.small * quantity;
                    } else if (size === "Medium 7+” (7-9 servings)") {
                      quantityForIngredient = materialIngredient.regular * quantity;
                    } else if (size === "Large 9+” (12-14 servings)") {
                      quantityForIngredient = materialIngredient.large * quantity;
                    }
  
                    if (!updatedMaterialsNeeded[pie]) {
                      updatedMaterialsNeeded[pie] = {};
                    }
                    if (!updatedMaterialsNeeded[pie][ingredient]) {
                      updatedMaterialsNeeded[pie][ingredient] = 0;
                    }
                    updatedMaterialsNeeded[pie][ingredient] += quantityForIngredient;
                  }
                }
              });
            }
          });
        });
      });
  
      setMaterialsNeeded(updatedMaterialsNeeded);
    };
  
    calculateMaterialsNeeded();
  }, [ordersData, materialsData]);
  

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setNewOrder({
      id: '',
      date: '',
      name: '',
      pies: [{ pie: '', size: '', quantity: 0 }],
      type: '',
      remarks: '',
      status: 'Pending'
    });
  };

  const handleOpenEditMaterialsDialog = (material: Material) => {
    setEditMaterial({ ...material });
    setOpenEditMaterialsDialog(true);
  };

  const handleCloseEditMaterialsDialog = () => {
    setEditMaterial(null);
    setOpenEditMaterialsDialog(false);
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLInputElement>, size: keyof MaterialSize, ingredient: keyof Omit<Material, 'id' | 'name'>) => {
    if (editMaterial) {
      const updatedMaterial = { ...editMaterial };
      if (updatedMaterial[ingredient] && typeof updatedMaterial[ingredient] === 'object') {
        (updatedMaterial[ingredient] as MaterialSize)[size] = parseFloat(e.target.value);
        setEditMaterial(updatedMaterial);
      }
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

  const addPie = () => {
    setNewOrder(prevState => ({
      ...prevState,
      pies: [...prevState.pies, { pie: '', size: '', quantity: 0 }]
    }));
  };

  const removePie = (index: number) => {
    const updatedPies = newOrder.pies.filter((_, i) => i !== index);
    setNewOrder(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const submitNewOrder = async (isDraft: boolean) => {
    try {
      const orderData = { ...newOrder, status: isDraft ? 'Draft' : 'Pending' };
      const docRef = await addDoc(collection(db, "companies/010/orders"), orderData);
      await updateDoc(doc(db, `companies/010/orders/${docRef.id}`), { id: docRef.id });
      fetchData();
      handleCloseAddDialog();
    } catch (error) {
      console.error('Error submitting new order:', error);
    }
  };
  const confirmDeleteMaterial = (materialId: string) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      deleteMaterial(materialId);
    }
  };
  
  const saveEditedMaterial = async () => {
    if (editMaterial) {
      try {
       // await updateDoc(doc(db, `companies/010/materials/${editMaterial.id}`), editMaterial);
        fetchData();
        handleCloseEditMaterialsDialog();
      } catch (error) {
        console.error('Error saving edited material:', error);
      }
    }
  };

  const renderPieQuantitiesTable = () => {
    const pieQuantities: { [key: string]: { [key: string]: number } } = {};

    ordersData.forEach(order => {
      const { pies } = order;
      pies.forEach(pieSelection => {
        const { pie, size, quantity } = pieSelection;

        if (!pieQuantities[pie]) {
          pieQuantities[pie] = {};
        }

        if (!pieQuantities[pie][size]) {
          pieQuantities[pie][size] = 0;
        }

        pieQuantities[pie][size] += quantity;
      });
    });

    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-1/3 px-4 py-2">Pie</th>
              <th className="w-1/3 px-4 py-2">Size</th>
              <th className="w-1/3 px-4 py-2">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(pieQuantities).map(pie => (
              Object.keys(pieQuantities[pie]).map((size, index) => (
                <tr key={`${pie}-${size}`} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}>
                  {index === 0 && (
                    <td rowSpan={Object.keys(pieQuantities[pie]).length} className="border px-4 py-2">{pie}</td>
                  )}
                  <td className="border px-4 py-2">{size}</td>
                  <td className="border px-4 py-2">{pieQuantities[pie][size]}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const submitNewMaterial = async () => {
    try {
      const materialData = {
        ...newMaterial,
        ...materialFields.reduce((acc, field) => {
          acc[field.name] = {
            small: field.small,
            regular: field.regular,
            large: field.large
          };
          return acc;
        }, {} as { [key: string]: MaterialSize })
      };
      await addDoc(collection(db, "companies/010/materials"), materialData);
      fetchData();
      handleCloseAddMaterialDialog();
    } catch (error) {
      console.error('Error adding new material:', error);
    }
  };
  const renderMaterialsTable = () => {
    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-1/3 px-4 py-2">Pie</th>
              <th className="w-1/3 px-4 py-2">Material</th>
              <th className="w-1/3 px-4 py-2">Quantity</th>
              <th className="w-1/6 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(materialsNeeded).map(pie => {
              const pieMaterials = Object.keys(materialsNeeded[pie]);
              return pieMaterials.map((material, index) => (
                <tr key={`${pie}-${material}`} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}>
                  {index === 0 && (
                    <>
                      <td rowSpan={pieMaterials.length} className="border px-4 py-2">{pie}</td>
                      <td className="border px-4 py-2">{material}</td>
                      <td className="border px-4 py-2">{materialsNeeded[pie][material]}</td>
                      <td rowSpan={pieMaterials.length} className="border px-4 py-2 flex space-x-2">
                        <button onClick={() => handleOpenEditMaterialsDialog(materialsData.find(mat => mat.name === pie) as Material)} className="p-2 bg-primary text-white rounded">
                          Edit
                        </button>
                       
                      </td>
                    </>
                  )}
                  {index !== 0 && (
                    <>
                      <td className="border px-4 py-2">{material}</td>
                      <td className="border px-4 py-2">{materialsNeeded[pie][material]}</td>
                    </>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    );
  };
  
  

  return (
    <div className="grid grid-cols-12 gap-6">
      <ToastContainer />
      <div className="col-span-12 2xl:col-span-9">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 mt-8">
            <div className="flex items-center h-10 intro-y pt-4 pb-4 pl-6 pr-6">
         
            </div>
            <Transition show={openAddMaterialDialog} as={React.Fragment}>
  <Dialog onClose={handleCloseAddMaterialDialog} className="fixed inset-0 z-10 overflow-y-auto">
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
            Add New Material
          </Dialog.Title>
          <div className="mt-2">
            <input
              type="text"
              name="name"
              placeholder="Material Name"
              value={newMaterial.name}
              onChange={handleNewMaterialChange}
              className="w-full border p-2 rounded"
            />
            {materialFields.map((field, index) => (
              <div key={index} className="mt-2">
                <input
                  type="text"
                  placeholder="Field Name"
                  value={field.name}
                  onChange={(e) => handleMaterialNameChange(index, e.target.value)}
                  className="w-full border p-2 rounded"
                />
                <div className="flex flex-col mt-2">
                  <label className="mt-1">Small</label>
                  <input
                    type="number"
                    step="0.01"
                    value={field.small}
                    onChange={(e) => handleMaterialFieldChange(index, 'small', parseFloat(e.target.value))}
                    className="w-full border p-2 rounded mt-1"
                  />
                  <label className="mt-1">Regular</label>
                  <input
                    type="number"
                    step="0.01"
                    value={field.regular}
                    onChange={(e) => handleMaterialFieldChange(index, 'regular', parseFloat(e.target.value))}
                    className="w-full border p-2 rounded mt-1"
                  />
                  <label className="mt-1">Large</label>
                  <input
                    type="number"
                    step="0.01"
                    value={field.large}
                    onChange={(e) => handleMaterialFieldChange(index, 'large', parseFloat(e.target.value))}
                    className="w-full border p-2 rounded mt-1"
                  />
                </div>
              </div>
            ))}
            <button onClick={addMaterialField} className="mt-2 p-2 bg-primary text-white rounded">
              Add New Field
            </button>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleCloseAddMaterialDialog}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitNewMaterial}
              className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      </Transition.Child>
    </div>
  </Dialog>
</Transition>


            <div className="mt-5">
              <div className="flex space-x-4 justify-center items-center mb-4">
                <DatePickerComponent
                  selected={dateRange[0]}
                  onChange={(date: Date) => setDateRange([date, dateRange[1]])}
                  selectsStart
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  className="bg-white rounded"
                />
                <DatePickerComponent
                  selected={dateRange[1]}
                  onChange={(date: Date) => setDateRange([dateRange[0], date])}
                  selectsEnd
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  className="bg-white rounded"
                />
              </div>
              <div className="p-5 flex space-x-4">
              <button onClick={handleOpenAddMaterialDialog} className="mt-2 p-3 bg-primary text-white rounded">
                Add New Pie
              </button>
              <button onClick={handleOpenDeletePiesDialog} className="mt-2 p-3 bg-red-500 text-white rounded">
                Delete Pie
              </button>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-semibold">Orders</div>
                    <div className="flex space-x-2">
                      <button onClick={prevImportantNotes} className="p-2">
                        <ChevronLeft />
                      </button>
                      <button onClick={nextImportantNotes} className="p-2">
                        <ChevronRight />
                      </button>
                    </div>
                  </div>
                  {renderPieQuantitiesTable()}
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-lg font-semibold mb-4">Materials</div>
                  {renderMaterialsTable()}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 mt-8">
         
          </div>
        </div>
      </div>

     

      <Transition show={openEditMaterialsDialog} as={React.Fragment}>
      <Dialog onClose={handleCloseEditMaterialsDialog} className="fixed inset-0 z-10 overflow-y-auto">
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
                Edit Material
              </Dialog.Title>
              <div className="mt-2">
                {editMaterial && (
                  <>
                    <h4 className="text-md font-medium leading-6 text-gray-900">{editMaterial.name}</h4>
                    {Object.keys(editMaterial).map(ingredient => (
                      editMaterial[ingredient as keyof Material] && typeof editMaterial[ingredient as keyof Material] === 'object' && (
                        <div key={ingredient}>
                          <label className="block text-sm font-medium text-gray-700">{ingredient}</label>
                          {['small', 'regular', 'large'].map(size => (
                            <input
                              key={size}
                              type="number"
                              step="0.01"
                              value={(editMaterial[ingredient as keyof Material] as MaterialSize)[size as keyof MaterialSize]}
                              onChange={(e) => handleMaterialChange(e, size as keyof MaterialSize, ingredient as keyof Omit<Material, 'id' | 'name'>)}
                              className="w-full border p-2 rounded mt-1"
                              placeholder={`${size} size`}
                            />
                          ))}
                        </div>
                      )
                    ))}
                  </>
                )}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleCloseEditMaterialsDialog}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditedMaterial}
                  className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Save
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
    <DeletePiesDialog />
    </div>
  );
}

export default Main;
