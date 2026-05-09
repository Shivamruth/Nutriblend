import { useEffect, useMemo, useState } from "react";
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
};

const categories = ["All", "Natural", "Whey", "Preworkout", "Premium"];

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

  const isEditing = Boolean(editingId);
  const previewImage = getImagePreview(form.image);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
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
  };

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        categoryFilter === "All" || product.category === categoryFilter;

      const matchesSearch =
        !query ||
        String(product.name || "").toLowerCase().includes(query) ||
        String(product.category || "").toLowerCase().includes(query) ||
        String(product.protein || "").toLowerCase().includes(query) ||
        String(product.description || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, categoryFilter]);

  const productStats = useMemo(() => {
    return {
      total: products.length,
      natural: products.filter((p) => p.category === "Natural").length,
      whey: products.filter((p) => p.category === "Whey").length,
      preworkout: products.filter((p) => p.category === "Preworkout").length,
      premium: products.filter((p) => p.category === "Premium").length,
    };
  }, [products]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
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

  const buildPayload = () => {
    return {
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
    };
  };

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
    });

    document
      .querySelector(".admin-product-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteProduct = async (product) => {
    const confirmDelete = window.confirm(
      `Delete "${product.name}"?\n\nThis product will be removed from the store.`
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

      if (editingId === product.id) {
        resetForm();
      }
    }

    setLoading(false);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All");
  };

  return (
    <section className="admin-products-section">
      <div className="admin-products-header">
        <div>
          <p className="admin-eyebrow">Product Control</p>
          <h3>Manage Products</h3>
          <p className="admin-products-subtitle">
            Add, edit, search, filter, and remove NutriBlend products.
          </p>
        </div>

        <button className="refresh-btn" onClick={fetchProducts} disabled={loading}>
          {loading ? "Loading..." : "Refresh Products"}
        </button>
      </div>

      <div className="admin-product-stats">
        <ProductStat icon="📦" label="Total" value={productStats.total} />
        <ProductStat icon="🌿" label="Natural" value={productStats.natural} />
        <ProductStat icon="💪" label="Whey" value={productStats.whey} />
        <ProductStat icon="⚡" label="Preworkout" value={productStats.preworkout} />
        <ProductStat icon="👑" label="Premium" value={productStats.premium} />
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

          {isEditing && <span className="admin-edit-mode-badge">Edit Mode</span>}
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
              placeholder="Ingredients. Example: Milk 250ml, Whey 1 scoop, Oats 20g"
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
          placeholder="Search products by name, category, protein..."
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

        {(searchTerm || categoryFilter !== "All") && (
          <button onClick={clearFilters}>Clear</button>
        )}

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
                <th>Protein</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
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
                        className="danger"
                        onClick={() => deleteProduct(product)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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