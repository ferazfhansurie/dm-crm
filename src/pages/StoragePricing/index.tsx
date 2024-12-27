import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { FormInput, FormLabel } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import { toast } from 'react-toastify';
import { Plus } from "lucide-react";


interface StoragePrice {
  size: string;
  duration: string;
  discount: number;
  pricePerSf: number;
  priceAfterDiscount: number;
}

function StoragePricing() {
  const [pricingData, setPricingData] = useState<StoragePrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const firestore = getFirestore();

  // Fetch existing data
  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        const docRef = doc(firestore, 'companies', '0123', 'pricing', 'storage');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().data) {
          setPricingData(docSnap.data().data);
        } else {
          // Initialize with default data
          const defaultData: StoragePrice[] = [
            { size: "< 21", duration: "1 - 2", discount: 5, pricePerSf: 7.50, priceAfterDiscount: 7.125 },
            { size: "< 21", duration: "3 - 5", discount: 10, pricePerSf: 7.50, priceAfterDiscount: 6.75 },
            { size: "< 21", duration: "6 - 11", discount: 15, pricePerSf: 7.50, priceAfterDiscount: 6.375 },
            { size: "< 21", duration: "> 12", discount: 20, pricePerSf: 7.50, priceAfterDiscount: 6.00 },
            { size: "21 - 30", duration: "1 - 2", discount: 5, pricePerSf: 6.50, priceAfterDiscount: 6.175 },
            { size: "21 - 30", duration: "3 - 5", discount: 10, pricePerSf: 6.50, priceAfterDiscount: 5.85 },
            { size: "21 - 30", duration: "6 - 11", discount: 15, pricePerSf: 6.50, priceAfterDiscount: 5.525 },
            { size: "21 - 30", duration: "> 12", discount: 20, pricePerSf: 6.50, priceAfterDiscount: 5.20 },
            { size: "30 - 50", duration: "1 - 2", discount: 5, pricePerSf: 6.00, priceAfterDiscount: 5.70 },
            { size: "30 - 50", duration: "3 - 5", discount: 10, pricePerSf: 6.00, priceAfterDiscount: 5.40 },
            { size: "30 - 50", duration: "6 - 11", discount: 15, pricePerSf: 6.00, priceAfterDiscount: 5.10 },
            { size: "30 - 50", duration: "> 12", discount: 20, pricePerSf: 6.00, priceAfterDiscount: 4.80 },
            { size: "50 - 70", duration: "1 - 2", discount: 5, pricePerSf: 5.50, priceAfterDiscount: 5.225 },
            { size: "50 - 70", duration: "3 - 5", discount: 10, pricePerSf: 5.50, priceAfterDiscount: 4.95 },
            { size: "50 - 70", duration: "6 - 11", discount: 15, pricePerSf: 5.50, priceAfterDiscount: 4.675 },
            { size: "50 - 70", duration: "> 12", discount: 20, pricePerSf: 5.50, priceAfterDiscount: 4.40 },
            { size: "70 - 100", duration: "1 - 2", discount: 5, pricePerSf: 5.00, priceAfterDiscount: 4.75 },
            { size: "70 - 100", duration: "3 - 5", discount: 10, pricePerSf: 5.00, priceAfterDiscount: 4.50 },
            { size: "70 - 100", duration: "6 - 11", discount: 15, pricePerSf: 5.00, priceAfterDiscount: 4.25 },
            { size: "70 - 100", duration: "> 12", discount: 20, pricePerSf: 5.00, priceAfterDiscount: 4.00 },
            { size: "100 - 200", duration: "1 - 2", discount: 5, pricePerSf: 4.60, priceAfterDiscount: 4.37 },
            { size: "100 - 200", duration: "3 - 5", discount: 10, pricePerSf: 4.60, priceAfterDiscount: 4.14 },
            { size: "100 - 200", duration: "6 - 11", discount: 15, pricePerSf: 4.60, priceAfterDiscount: 3.91 },
            { size: "100 - 200", duration: "> 12", discount: 20, pricePerSf: 4.60, priceAfterDiscount: 3.68 },
            { size: "> 200", duration: "1 - 2", discount: 5, pricePerSf: 4.50, priceAfterDiscount: 4.275 },
            { size: "> 200", duration: "3 - 5", discount: 10, pricePerSf: 4.50, priceAfterDiscount: 4.05 },
            { size: "> 200", duration: "6 - 11", discount: 15, pricePerSf: 4.50, priceAfterDiscount: 3.825 },
            { size: "> 200", duration: "> 12", discount: 20, pricePerSf: 4.50, priceAfterDiscount: 3.60 }
          ];
          setPricingData(defaultData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load pricing data");
      }
    };

    fetchPricingData();
  }, [firestore]);

  const handleInputChange = (index: number, field: keyof StoragePrice, value: string | number) => {
    const newData = [...pricingData];
    newData[index] = {
      ...newData[index],
      [field]: value
    };

    // Recalculate price after discount
    if (field === 'pricePerSf' || field === 'discount') {
      const price = Number(newData[index].pricePerSf);
      const discount = Number(newData[index].discount);
      newData[index].priceAfterDiscount = Number((price * (1 - discount / 100)).toFixed(3));
    }

    setPricingData(newData);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save to the 'pricing' subcollection with document ID 'storage'
      await setDoc(doc(firestore, 'companies', '0123', 'pricing', 'storage'), {
        data: pricingData,
        updatedAt: new Date()
      });
      
      toast.success("Pricing data saved successfully");
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Failed to save pricing data");
    }
    setIsLoading(false);
  };

  const addNewSize = () => {
    const lastSize = pricingData[pricingData.length - 1];
    const newSizeEntries: StoragePrice[] = [
      { size: "New Size", duration: "1 - 2", discount: 5, pricePerSf: 4.50, priceAfterDiscount: 4.275 },
      { size: "New Size", duration: "3 - 5", discount: 10, pricePerSf: 4.50, priceAfterDiscount: 4.05 },
      { size: "New Size", duration: "6 - 11", discount: 15, pricePerSf: 4.50, priceAfterDiscount: 3.825 },
      { size: "New Size", duration: "> 12", discount: 20, pricePerSf: 4.50, priceAfterDiscount: 3.60 }
    ];
    setPricingData([...pricingData, ...newSizeEntries]);
  };

  return (
    <div className="w-full h-screen px-4 py-6 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Storage Pricing</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={addNewSize}
          >
            <Plus className="w-5 h-5 mr-1" />
            Add Size Range
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden border rounded-lg shadow-lg">
        {/* Table Header with description */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 border-b">
          <h3 className="text-lg font-medium">Storage Unit Pricing Matrix</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Manage storage unit prices based on size and duration. All prices are in RM per square foot.
          </p>
        </div>

        {/* Scrollable Table Container */}
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                  Size (sf)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                  Duration (Months)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                  Discount (%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                  Price per sf
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                  Price after Discount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {pricingData.reduce((rows: JSX.Element[], row, index, array) => {
                const isFirstInSize = index === 0 || row.size !== array[index - 1].size;
                const isLastInSize = index === array.length - 1 || row.size !== array[index + 1].size;

                rows.push(
                  <tr 
                    key={index}
                    className={`
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${isFirstInSize ? 'border-t-2 border-gray-300 dark:border-gray-500' : ''}
                      ${isLastInSize ? 'border-b-2 border-gray-300 dark:border-gray-500' : ''}
                      ${isFirstInSize ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}
                    `}
                  >
                    <td className="px-6 py-2">
                      {isFirstInSize ? (
                        <FormInput
                          value={row.size}
                          onChange={(e) => handleInputChange(index, 'size', e.target.value)}
                          className="w-full rounded border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      ) : null}
                    </td>
                    <td className="px-6 py-2">
                      <FormInput
                        value={row.duration}
                        onChange={(e) => handleInputChange(index, 'duration', e.target.value)}
                        className="w-full rounded border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </td>
                    <td className="px-6 py-2">
                      <FormInput
                        type="number"
                        value={row.discount}
                        onChange={(e) => handleInputChange(index, 'discount', Number(e.target.value))}
                        className="w-full rounded border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </td>
                    <td className="px-6 py-2">
                      <FormInput
                        type="number"
                        step="0.01"
                        value={row.pricePerSf}
                        onChange={(e) => handleInputChange(index, 'pricePerSf', Number(e.target.value))}
                        className="w-full rounded border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </td>
                    <td className="px-6 py-2">
                      <FormInput
                        type="number"
                        step="0.001"
                        value={row.priceAfterDiscount}
                        disabled
                        className="w-full rounded bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                    </td>
                  </tr>
                );
                return rows;
              }, [])}
            </tbody>
          </table>
        </div>

        {/* Table Footer with summary */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 border-t">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Total Pricing Tiers: {pricingData.length} | Last Updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoragePricing; 