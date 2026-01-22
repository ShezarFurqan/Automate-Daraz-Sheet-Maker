import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/* ================= CONSTANTS ================= */

const emptyOrder = {
  dateTime: "",
  orderId: "",
  products: [{ productName: "", purchasingPrice: "", unitsSold: "", list: "" }],
  grossSale: "",
  netSales: "",
  darazCommission: "",
  profit: "",
  loss: "",
  payment: "",
};

/* ================= APP ================= */

const App = () => {
  const [showForm, setShowForm] = useState(false);
  const [orders, setOrders] = useState([]);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [editId, setEditId] = useState(null); // Firestore doc ID

  /* ================= CALCULATION ================= */

  const calculateOrder = (data) => {
    const purchasingTotal = data.products.reduce(
      (sum, p) =>
        sum + Number(p.purchasingPrice || 0) * Number(p.unitsSold || 0),
      0
    );

    let updated = { ...data, profit: "", loss: "" };

    const gross = Number(data.grossSale || 0);
    const net = Number(data.netSales || 0);

    if (gross && net) updated.darazCommission = gross - net;

    if (net) {
      const result = net - purchasingTotal;
      result >= 0
        ? (updated.profit = result)
        : (updated.loss = Math.abs(result));
    }

    return updated;
  };

  /* ================= FIRESTORE ================= */

  const fetchOrders = async () => {
    const snapshot = await getDocs(collection(db, "orders"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setOrders(data);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const saveOrder = async () => {
    const safeOrder = structuredClone(calculateOrder(orderForm));

    try {
      if (editId) {
        // Update existing
        const orderRef = doc(db, "orders", editId);
        await updateDoc(orderRef, { ...safeOrder, updatedAt: Timestamp.now() });
      } else {
        // Add new
        await addDoc(collection(db, "orders"), {
          ...safeOrder,
          createdAt: Timestamp.now(),
        });
      }

      setOrderForm(emptyOrder);
      setShowForm(false);
      setEditId(null);
      fetchOrders();
    } catch (error) {
      console.error("Firestore Error:", error);
    }
  };

  const deleteOrder = async (id) => {
    if (window.confirm("Delete this order?")) {
      await deleteDoc(doc(db, "orders", id));
      fetchOrders();
    }
  };

  const handleEdit = (order) => {
    setOrderForm(order);
    setEditId(order.id);
    setShowForm(true);
  };


  const exportExcel = () => {
    if (!orders.length) return alert("No orders to export!");

    const data = orders.map(o => ({
      "Order ID": o.orderId,
      "Date/Time": o.dateTime,
      "Gross Sale": o.grossSale,
      "Net Sale": o.netSales,
      "Daraz Commission": o.darazCommission,
      "Profit": o.profit,
      "Loss": o.loss,
      "Payment": o.payment,
      "Products": o.products.map(p => `${p.productName}(${p.unitsSold})`).join(" | "),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "orders.xlsx");
  };


  /* ================= FORM HANDLERS ================= */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrderForm((prev) => calculateOrder({ ...prev, [name]: value }));
  };

  const handleProductChange = (i, e) => {
    const { name, value } = e.target;
    const products = structuredClone(orderForm.products);
    products[i][name] = value;
    setOrderForm((prev) => calculateOrder({ ...prev, products }));
  };

  const addProduct = () => {
    setOrderForm((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        { productName: "", purchasingPrice: "", unitsSold: "", list: "" },
      ],
    }));
  };

  const removeProduct = (i) => {
    setOrderForm((prev) => ({
      ...prev,
      products: prev.products.filter((_, idx) => idx !== i),
    }));
  };

  /* ================= UI ================= */

  return (
    <div className="max-w-7xl mx-auto p-6">
      <button
        onClick={() => {
          setShowForm(true);
          setOrderForm(emptyOrder);
          setEditId(null);
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        + Add Order
      </button>
      <button
        onClick={() => {
          exportExcel()
        }}
        className="bg-green-600 ml-2 text-white px-4 py-2 rounded mb-4"
      >
        Export Sheet
      </button>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveOrder();
          }}
          className="bg-white p-4 rounded shadow mb-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              type="datetime-local"
              name="dateTime"
              value={orderForm.dateTime}
              onChange={handleChange}
              className="border p-2"
            />
            <input
              name="orderId"
              placeholder="Order ID *"
              value={orderForm.orderId}
              onChange={handleChange}
              className="border p-2"
            />
          </div>

          <h3 className="font-semibold">Products</h3>

          {orderForm.products.map((p, i) => (
            <div key={i} className="grid grid-cols-5 gap-2">
              <input
                name="productName"
                value={p.productName}
                onChange={(e) => handleProductChange(i, e)}
                placeholder="Name"
                className="border p-2"
              />
              <input
                name="purchasingPrice"
                value={p.purchasingPrice}
                onChange={(e) => handleProductChange(i, e)}
                placeholder="Price"
                className="border p-2"
              />
              <input
                name="unitsSold"
                value={p.unitsSold}
                onChange={(e) => handleProductChange(i, e)}
                placeholder="Units"
                className="border p-2"
              />
              <input
                name="list"
                value={p.list}
                onChange={(e) => handleProductChange(i, e)}
                placeholder="List"
                className="border p-2"
              />
              {orderForm.products.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProduct(i)}
                  className="bg-red-500 text-white rounded"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addProduct}
            className="bg-green-600 text-white px-3 py-1 rounded"
          >
            + Add Product
          </button>

          <div className="grid grid-cols-3 gap-3">
            {["grossSale", "netSales", "payment"].map((f) => (
              <input
                key={f}
                name={f}
                value={orderForm[f]}
                onChange={handleChange}
                placeholder={f}
                className="border p-2"
              />
            ))}
          </div>

          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            {editId ? "Update Order" : "Submit Order"}
          </button>
        </form>
      )}

      <table className="w-full border border-collapse text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Order</th>
            <th className="border p-2">Gross</th>
            <th className="border p-2">Net</th>
            <th className="border p-2">Commission</th>
            <th className="border p-2">Profit</th>
            <th className="border p-2">Loss</th>
            <th className="border p-2">Products</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="border p-2">{o.orderId}</td>
              <td className="border p-2">{o.grossSale}</td>
              <td className="border p-2">{o.netSales}</td>
              <td className="border p-2">{o.darazCommission}</td>
              <td className="border p-2 text-green-600">{o.profit}</td>
              <td className="border p-2 text-red-600">{o.loss}</td>
              <td className="border p-1">
                {o.products.map((p, pi) => (
                  <div key={pi}>
                    {p.productName} ({p.unitsSold})
                  </div>
                ))}
              </td>
              <td className="border p-2 space-x-2">
                <button
                  onClick={() => handleEdit(o)}
                  className="text-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteOrder(o.id)}
                  className="text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
