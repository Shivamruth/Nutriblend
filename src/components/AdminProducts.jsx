import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";

const emptyForm = {
  name: "",
  protein: "",
  price: "",
  category: "Natural",
  ingredients: "",
  description: "",
  image: "",
  calories: "",
  quantity: "",
  benefits: "",
  is_active: true,
  stock_status: "In Stock",
};

const categories = ["All", "Natural", "Whey", "Preworkout", "Premium"];
const statusFilters = ["All", "Active", "Inactive"];
const stockStatuses = ["In Stock", "Limited Stock", "Out of Stock"];

const getImagePreview = (image) => {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  if (image.startsWith("/")) return image;
  return `/${image}`;
};

export default function AdminProducts({ notify }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  const isEditing = Boolean(editingId);
  const previewImage = getImagePreview(form.image);

  const fetchProducts = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Fetch products error:", error);
      notify?.("Failed to load products", "error");
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }, [notify]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const isActive = product.is_active !== false;
      const stockStatus = product.stock_status || "In Stock";

      const matchesCategory =
        categoryFilter === "All" || product.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && isActive) ||
        (statusFilter === "Inactive" && !isActive);

      const matchesStock =
        stockFilter === "All" || stockStatus === stockFilter;

      const matchesSearch =
        !query ||
        String(product.name || "").toLowerCase().includes(query) ||
        String(product.category || "").toLowerCase().includes(query) ||
        String(product.protein || "").toLowerCase().includes(query) ||
        String(product.description || "").toLowerCase().includes(query) ||
        String(product.benefits || "").toLowerCase().includes(query) ||
        String(stockStatus).toLowerCase().includes(query);

      return matchesCategory && matchesStatus && matchesStock && matchesSearch;
    });
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter]);

  const productStats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter((p) => p.is_active !== false).length,
      inactive: products.filter((p) => p.is_active === false).length,
      inStock: products.filter((p) => (p.stock_status || "In Stock") === "In Stock").length,
      limited: products.filter((p) => p.stock_status === "Limited Stock").length,
      outOfStock: products.filter((p) => p.stock_status === "Out of Stock").length,
    };
  }, [products]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      notify?.("Product name is required", "error");
      return false;
    }

    if (!form.price || Number(form.price) <= 0) {
      notify?.("Valid price is required", "error");
      return false;
    }

    if (!form.category) {
      notify?.("Category is required", "error");
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    protein: form.protein.trim(),
    price: Number(form.price),
    category: form.category,
    ingredients: form.ingredients.trim(),
    description: form.description.trim(),
    image: form.image.trim(),
    calories: form.calories.trim(),
    quantity: form.quantity.trim(),
    benefits: form.benefits.trim(),
    is_active: form.is_active,
    stock_status: form.stock_status || "In Stock",
  });

  const saveProduct = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = buildPayload();

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        notify?.("Product updated successfully ✅", "success");
      } else {
        const { error } = await supabase.from("products").insert([payload]);

        if (error) throw error;

        notify?.("Product added successfully ✅", "success");
      }

      resetForm();
      await fetchProducts();
    } catch (error) {
      console.error("Save product error:", error);
      notify?.(error.message || "Failed to save product", "error");
    } finally {
      setLoading(false);
    }
  };

  const editProduct = (product) => {
    setEditingId(product.id);

    setForm({
      name: product.name || "",
      protein: product.protein || "",
      price: product.price || "",
      category: product.category || "Natural",
      ingredients: product.ingredients || "",
      description: product.description || "",
      image: product.image || "",
      calories: product.calories || "",
      quantity: product.quantity || "",
      benefits: product.benefits || "",
      is_active: product.is_active !== false,
      stock_status: product.stock_status || "In Stock",
    });

    document
      .querySelector(".admin-product-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleProductStatus = async (product) => {
    const nextStatus = product.is_active === false;

    setLoading(true);

    const { error } = await supabase
      .from("products")
      .update({ is_active: nextStatus })
      .eq("id", product.id);

    if (error) {
      console.error("Toggle product status error:", error);
      notify?.("Failed to update product status", "error");
    } else {
      notify?.(
        nextStatus ? "Product activated ✅" : "Product hidden from store ✅",
        "success"
      );
      await fetchProducts();

      if (editingId === product.id) {
        setForm((prev) => ({ ...prev, is_active: nextStatus }));
      }
    }

    setLoading(false);
  };

  const updateStockStatus = async (product, stockStatus) => {
    setLoading(true);

    const { error } = await supabase
      .from("products")
      .update({ stock_status: stockStatus })
      .eq("id", product.id);

    if (error) {
      console.error("Stock status update error:", error);
      notify?.("Failed to update stock status", "error");
    } else {
      notify?.("Stock status updated ✅", "success");
      await fetchProducts();

      if (editingId === product.id) {
        setForm((prev) => ({ ...prev, stock_status: stockStatus }));
      }
    }

    setLoading(false);
  };

  const deleteProduct = async (product) => {
    const confirmDelete = window.confirm(
      `Delete "${product.name}" permanently?\n\nRecommended: use Hide instead of Delete.`
    );

    if (!confirmDelete) return;

    setLoading(true);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error("Delete product error:", error);
      notify?.("Failed to delete product", "error");
    } else {
      notify?.("Product deleted ✅", "success");
      await fetchProducts();

      if (editingId === product.id) resetForm();
    }

    setLoading(false);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All");
    setStatusFilter("All");
    setStockFilter("All");
  };

  return (
    <section className="admin-products-section">
      <div className="admin-products-header">
        <div>
          <p className="admin-eyebrow">Product Control</p>
          <h3>Manage Products</h3>
          <p className="admin-products-subtitle">
            Add, edit, search, filter, hide, activate, and control stock status.
          </p>
        </div>

        <button className="refresh-btn" onClick={fetchProducts} disabled={loading}>
          {loading ? "Loading..." : "Refresh Products"}
        </button>
      </div>

      <div className="admin-product-stats">
        <ProductStat icon="📦" label="Total" value={productStats.total} />
        <ProductStat icon="✅" label="Active" value={productStats.active} />
        <ProductStat icon="🙈" label="Hidden" value={productStats.inactive} />
        <ProductStat icon="🟢" label="In Stock" value={productStats.inStock} />
        <ProductStat icon="🔴" label="Out" value={productStats.outOfStock} />
      </div>

      <form className="admin-product-form" onSubmit={saveProduct}>
        <div className="admin-product-form-head">
          <div>
            <h4>{isEditing ? "Edit Product" : "Add New Product"}</h4>
            <p>
              {isEditing
                ? "You are editing an existing product."
                : "Create a new product for the Home page."}
            </p>
          </div>

          <div className="admin-form-badges">
            {isEditing && <span className="admin-edit-mode-badge">Edit Mode</span>}
            <span
              className={`admin-active-status-badge ${
                form.is_active ? "active" : "inactive"
              }`}
            >
              {form.is_active ? "Active" : "Hidden"}
            </span>
            <span
              className={`admin-stock-chip ${form.stock_status
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              {form.stock_status}
            </span>
          </div>
        </div>

        <div className="admin-product-form-layout">
          <div className="admin-form-grid">
            <input
              name="name"
              placeholder="Product name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <input
              name="protein"
              placeholder="Protein e.g. 20g"
              value={form.protein}
              onChange={handleChange}
            />

            <input
              name="price"
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={handleChange}
              required
            />

            <select name="category" value={form.category} onChange={handleChange}>
              {categories
                .filter((cat) => cat !== "All")
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>

            <select
              name="stock_status"
              value={form.stock_status}
              onChange={handleChange}
            >
              {stockStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <input
              name="calories"
              placeholder="Calories e.g. 300 kcal"
              value={form.calories}
              onChange={handleChange}
            />

            <input
              name="quantity"
              placeholder="Quantity e.g. 300ml"
              value={form.quantity}
              onChange={handleChange}
            />

            <input
              className="admin-form-wide"
              name="image"
              placeholder="Image URL or image path e.g. /products/shake.png"
              value={form.image}
              onChange={handleChange}
            />

            <textarea
              className="admin-form-wide"
              name="description"
              placeholder="Product description"
              value={form.description}
              onChange={handleChange}
              rows="3"
            />

            <textarea
              className="admin-form-wide"
              name="ingredients"
              placeholder="Ingredients. Example: Milk 250ml 8g, Whey 1 scoop 24g"
              value={form.ingredients}
              onChange={handleChange}
              rows="3"
            />

            <textarea
              className="admin-form-wide"
              name="benefits"
              placeholder="Benefits. Example: Muscle recovery, Daily protein, Energy"
              value={form.benefits}
              onChange={handleChange}
              rows="3"
            />

            <label className="admin-active-toggle admin-form-wide">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
              />
              <span>Show this product on Home page</span>
            </label>
          </div>

          <div className="admin-image-preview-card">
            <span>Image Preview</span>

            {previewImage ? (
              <img
                src={previewImage}
                alt="Product preview"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="admin-image-placeholder">
                <strong>🥤</strong>
                <p>No image added</p>
              </div>
            )}

            <p>
              Use image URL or public path like{" "}
              <code>/products/product-name.png</code>
            </p>
          </div>
        </div>

        <div className="admin-product-actions">
          <button
            type="submit"
            className="admin-save-product-btn"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : isEditing
              ? "Update Product"
              : "Add Product"}
          </button>

          <button
            type="button"
            className="admin-cancel-product-btn"
            onClick={resetForm}
          >
            {isEditing ? "Cancel Edit" : "Clear Form"}
          </button>
        </div>
      </form>

      <div className="admin-product-tools">
        <input
          type="text"
          placeholder="Search products by name, category, protein, stock..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "All" ? "All Categories" : cat}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusFilters.map((status) => (
            <option key={status} value={status}>
              {status === "All" ? "All Products" : status}
            </option>
          ))}
        </select>

        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
        >
          <option value="All">All Stock</option>
          {stockStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {(searchTerm ||
          categoryFilter !== "All" ||
          statusFilter !== "All" ||
          stockFilter !== "All") && <button onClick={clearFilters}>Clear</button>}

        <span>
          Showing {filteredProducts.length} / {products.length}
        </span>
      </div>

      <div className="admin-products-table-wrap">
        {loading && products.length === 0 ? (
          <div className="admin-empty">
            <p>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-empty">
            <p>No matching products found</p>
          </div>
        ) : (
          <table className="admin-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Status</th>
                <th>Stock</th>
                <th>Protein</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const isActive = product.is_active !== false;
                const stockStatus = product.stock_status || "In Stock";

                return (
                  <tr
                    key={product.id}
                    className={!isActive ? "product-hidden-row" : ""}
                  >
                    <td>
                      <div className="admin-product-name">
                        <strong>{product.name}</strong>
                        <span>{product.description || "No description"}</span>
                      </div>
                    </td>

                    <td>
                      <span className="admin-product-category-chip">
                        {product.category || "N/A"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`admin-product-status-chip ${
                          isActive ? "active" : "inactive"
                        }`}
                      >
                        {isActive ? "Active" : "Hidden"}
                      </span>
                    </td>

                    <td>
                      <select
                        className="admin-stock-select"
                        value={stockStatus}
                        onChange={(e) =>
                          updateStockStatus(product, e.target.value)
                        }
                      >
                        {stockStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>{product.protein || "N/A"}</td>

                    <td>
                      <strong>
                        ₹{Number(product.price || 0).toLocaleString("en-IN")}
                      </strong>
                    </td>

                    <td>{product.quantity || "N/A"}</td>

                    <td>
                      <div className="admin-product-row-actions">
                        <button onClick={() => editProduct(product)}>Edit</button>

                        <button
                          className={isActive ? "warning" : "success"}
                          onClick={() => toggleProductStatus(product)}
                        >
                          {isActive ? "Hide" : "Activate"}
                        </button>

                        <button
                          className="danger"
                          onClick={() => deleteProduct(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function ProductStat({ icon, label, value }) {
  return (
    <div className="admin-product-stat-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}
