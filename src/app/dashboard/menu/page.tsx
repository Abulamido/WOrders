"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    GripVertical,
    Image as ImageIcon,
    DollarSign,
    Clock,
    Tag,
    X,
    Loader2,
    PackageCheck,
    PackageX
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface MenuVariant {
    name: string;
    price: number;
}

interface MenuModifier {
    name: string;
    price: number;
}

interface MenuItemType {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    is_available: boolean;
    variants: MenuVariant[];
    modifiers: MenuModifier[];
    prep_time_min: number;
    category_id: string;
}

interface CategoryType {
    id: string;
    name: string;
    items: MenuItemType[];
}

export default function MenuBuilder() {
    const [categories, setCategories] = useState<CategoryType[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryType | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Category Form State
    const [categoryName, setCategoryName] = useState("");

    // Item Form State
    const [itemName, setItemName] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [itemPrice, setItemPrice] = useState("");
    const [itemImageUrl, setItemImageUrl] = useState<string | null>(null);
    const [itemPrepTime, setItemPrepTime] = useState("15");
    const [itemVariants, setItemVariants] = useState<MenuVariant[]>([]);
    const [itemModifiers, setItemModifiers] = useState<MenuModifier[]>([]);

    const fetchMenu = useCallback(async (currentOrgId: string) => {
        try {
            const menuRes = await fetch(`/api/menu/${currentOrgId}`);
            if (menuRes.ok) {
                const menuData = await menuRes.json();
                const mappedCategories = (menuData.categories || []).map((c: any) => ({
                    ...c,
                    items: c.menu_items || [],
                }));
                setCategories(mappedCategories);
                if (mappedCategories.length > 0 && !activeCategory) {
                    setActiveCategory(mappedCategories[0].id);
                } else if (mappedCategories.length > 0 && activeCategory) {
                    if (!mappedCategories.find((c: any) => c.id === activeCategory)) {
                        setActiveCategory(mappedCategories[0].id);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load menu data:", err);
        } finally {
            setLoading(false);
        }
    }, [activeCategory]);

    useEffect(() => {
        const storedOrgId = localStorage.getItem("cafeteriaflow_org_id");
        if (storedOrgId) {
            setOrgId(storedOrgId);
            fetchMenu(storedOrgId);
        }
    }, [fetchMenu]);

    const activeItems = categories.find((c) => c.id === activeCategory)?.items || [];

    const toggleAvailability = async (itemId: string) => {
        if (!orgId) return;
        let currentStatus = true;
        categories.forEach(c => {
            const item = c.items.find(i => i.id === itemId);
            if (item) currentStatus = item.is_available;
        });

        setCategories((prev) =>
            prev.map((cat) => ({
                ...cat,
                items: cat.items.map((item) =>
                    item.id === itemId ? { ...item, is_available: !item.is_available } : item
                ),
            }))
        );

        try {
            await fetch(`/api/menu/${orgId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId, is_available: !currentStatus }),
            });
        } catch (err) {
            console.error("API error:", err);
            if (orgId) fetchMenu(orgId);
        }
    };

    // --- Category Management ---
    const openCategoryModal = (cat?: CategoryType) => {
        if (cat) {
            setEditingCategory(cat);
            setCategoryName(cat.name);
        } else {
            setEditingCategory(null);
            setCategoryName("");
        }
        setIsCategoryModalOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId || !categoryName) return;
        setFormLoading(true);

        const method = editingCategory ? "PATCH" : "POST";
        const body: any = { name: categoryName };
        if (editingCategory) body.categoryId = editingCategory.id;

        try {
            const res = await fetch(`/api/menu/${orgId}/categories`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                await fetchMenu(orgId);
                setIsCategoryModalOpen(false);
            }
        } catch (err) {
            console.error("Failed to save category:", err);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteCategory = async (catId: string) => {
        if (!orgId || !confirm("Delete this category? All items inside will be deleted too.")) return;
        try {
            const res = await fetch(`/api/menu/${orgId}/categories`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryId: catId }),
            });
            if (res.ok) fetchMenu(orgId);
        } catch (err) {
            console.error("Failed to delete category:", err);
        }
    };

    // --- Item Management ---
    const openItemModal = (item?: MenuItemType) => {
        if (item) {
            setEditingItem(item);
            setItemName(item.name);
            setItemDescription(item.description || "");
            setItemPrice(item.price.toString());
            setItemImageUrl(item.image_url);
            setItemPrepTime(item.prep_time_min.toString());
            setItemVariants(item.variants || []);
            setItemModifiers(item.modifiers || []);
        } else {
            setEditingItem(null);
            setItemName("");
            setItemDescription("");
            setItemPrice("");
            setItemImageUrl(null);
            setItemPrepTime("15");
            setItemVariants([]);
            setItemModifiers([]);
        }
        setIsItemModalOpen(true);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId || !itemName || !activeCategory) return;
        setFormLoading(true);

        const method = editingItem ? "PATCH" : "POST";
        const body: any = {
            name: itemName,
            description: itemDescription,
            price: parseFloat(itemPrice),
            image_url: itemImageUrl,
            prep_time_min: parseInt(itemPrepTime),
            category_id: activeCategory,
            variants: itemVariants,
            modifiers: itemModifiers
        };
        if (editingItem) body.itemId = editingItem.id;

        try {
            const res = await fetch(`/api/menu/${orgId}`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                await fetchMenu(orgId);
                setIsItemModalOpen(false);
            }
        } catch (err) {
            console.error("Failed to save item:", err);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!orgId || !confirm("Delete this menu item?")) return;
        try {
            const res = await fetch(`/api/menu/${orgId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId }),
            });
            if (res.ok) fetchMenu(orgId);
        } catch (err) {
            console.error("Failed to delete item:", err);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !orgId) return;

        setFormLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`/api/menu/${orgId}/upload`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setItemImageUrl(data.url);
            } else {
                alert(`Upload failed: ${data.error || "Unknown error"}`);
            }
        } catch (err: any) {
            console.error("Upload error:", err);
            alert(`Network or Server Error: ${err.message}`);
        } finally {
            setFormLoading(false);
        }
    };

    // --- Variants / Modifiers Helpers ---
    const addVariant = () => setItemVariants([...itemVariants, { name: "", price: 0 }]);
    const removeVariant = (index: number) => setItemVariants(itemVariants.filter((_, i) => i !== index));
    const updateVariant = (index: number, field: keyof MenuVariant, value: string | number) => {
        const newVariants = [...itemVariants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setItemVariants(newVariants);
    };

    const addModifier = () => setItemModifiers([...itemModifiers, { name: "", price: 0 }]);
    const removeModifier = (index: number) => setItemModifiers(itemModifiers.filter((_, i) => i !== index));
    const updateModifier = (index: number, field: keyof MenuModifier, value: string | number) => {
        const newModifiers = [...itemModifiers];
        newModifiers[index] = { ...newModifiers[index], [field]: value };
        setItemModifiers(newModifiers);
    };

    // Stats
    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const availableItems = categories.reduce((sum, cat) => sum + cat.items.filter((i) => i.is_available).length, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Menu Builder</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {availableItems}/{totalItems} items available
                    </p>
                </div>
                {activeCategory && (
                    <button
                        onClick={() => openItemModal()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/20"
                    >
                        <Plus size={16} />
                        Add Item
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Category sidebar */}
                <div className="lg:col-span-1 space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 mb-3">
                        Categories
                    </h3>
                    {categories.map((cat) => (
                        <div key={cat.id} className="group relative">
                            <button
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                    activeCategory === cat.id
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <span className="truncate pr-8">{cat.name}</span>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-full",
                                    activeCategory === cat.id ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-500"
                                )}>
                                    {cat.items.length}
                                </span>
                            </button>
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openCategoryModal(cat)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-400">
                                    <Pencil size={14} />
                                </button>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => openCategoryModal()}
                        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-200 border border-dashed border-white/10 hover:border-emerald-500/30"
                    >
                        <Plus size={14} />
                        Add Category
                    </button>
                </div>

                {/* Items grid */}
                <div className="lg:col-span-3 space-y-3">
                    {!activeCategory && (
                        <div className="py-20 text-center text-gray-500 bg-[#141420]/50 rounded-2xl border border-dashed border-white/5">
                            Select or create a category to view items
                        </div>
                    )}
                    {activeItems.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                "bg-[#141420] border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20",
                                item.is_available ? "border-white/5 hover:border-white/10" : "border-white/5 opacity-60"
                            )}
                        >
                            <div className="flex items-start gap-4">
                                <div className="pt-1 cursor-grab text-gray-600 hover:text-gray-400">
                                    <GripVertical size={16} />
                                </div>
                                <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className={cn("w-full h-full object-cover", !item.is_available && "grayscale opacity-50")} />
                                    ) : (
                                        <ImageIcon size={20} className="text-gray-600" />
                                    )}
                                    {!item.is_available && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <span className="text-[8px] font-black text-white bg-red-600 px-1 rounded-sm rotate-[-15deg]">SOLD OUT</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-semibold text-white">{item.name}</h3>
                                            <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => toggleAvailability(item.id)}
                                                className={cn("p-2 rounded-lg transition-colors", item.is_available ? "text-emerald-400 hover:bg-emerald-500/10" : "text-amber-500 hover:bg-amber-500/10")}
                                                title={item.is_available ? "Mark as Sold Out" : "Mark as In Stock"}
                                            >
                                                {item.is_available ? <PackageCheck size={16} /> : <PackageX size={16} />}
                                            </button>
                                            <button onClick={() => openItemModal(item)} className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                                            {formatCurrency(item.price)}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Clock size={12} /> {item.prep_time_min} min
                                        </span>
                                        {item.variants?.length > 0 && (
                                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                                <Tag size={10} /> {item.variants.length} sizes
                                            </span>
                                        )}
                                        {item.modifiers?.length > 0 && (
                                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                <Plus size={10} /> {item.modifiers.length} add-ons
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {activeCategory && activeItems.length === 0 && (
                        <div className="py-20 text-center text-gray-600 italic bg-[#141420]/30 rounded-2xl">
                            No items in this category yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h3 className="text-xl font-bold">{editingCategory ? "Edit Category" : "Add Category"}</h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Category Name (e.g. 🍔 Burgers)</label>
                                <input
                                    type="text" required value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-colors">Cancel</button>
                                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold flex items-center justify-center">
                                    {formLoading ? <Loader2 className="animate-spin" size={20} /> : "Save Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h3 className="text-xl font-bold">{editingItem ? "Edit Item" : "Add New Item"}</h3>
                            <button onClick={() => setIsItemModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveItem} className="p-6 space-y-6 overflow-y-auto max-h-[85vh]">
                            {/* Image Upload */}
                            <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                                <div className="w-24 h-24 rounded-2xl bg-[#0a0a0f] border border-dashed border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 group relative">
                                    {itemImageUrl ? (
                                        <img src={itemImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={32} className="text-gray-700" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Pencil size={16} className="text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-white mb-1">Item Photo</h4>
                                    <p className="text-xs text-gray-500 mb-3">Upload a high-quality photo of the dish to attract more customers.</p>
                                    <label className="inline-flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-400 cursor-pointer transition-colors">
                                        {itemImageUrl ? "Change Photo" : "Choose Photo"}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Item Name</label>
                                    <input type="text" required value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 text-white" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                    <textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} rows={2} className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Base Price ($)</label>
                                    <input type="number" step="0.01" required value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 font-mono text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Prep Time (min)</label>
                                    <input type="number" required value={itemPrepTime} onChange={(e) => setItemPrepTime(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 font-mono text-white" />
                                </div>
                            </div>

                            {/* Options: Variants & Modifiers */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                                {/* Variants */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-white">Variants (e.g. Sizes)</label>
                                        <button type="button" onClick={addVariant} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold">
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {itemVariants.map((v, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input placeholder="Name" value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)} className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-lg py-2 px-3 text-xs text-white" />
                                                <input type="number" step="0.01" placeholder="Price" value={v.price} onChange={(e) => updateVariant(i, "price", parseFloat(e.target.value))} className="w-20 bg-[#0a0a0f] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-white" />
                                                <button type="button" onClick={() => removeVariant(i)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        {itemVariants.length === 0 && <p className="text-xs text-gray-500 italic">No variants added.</p>}
                                    </div>
                                </div>

                                {/* Modifiers */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-white">Add-ons (e.g. Toppings)</label>
                                        <button type="button" onClick={addModifier} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold">
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {itemModifiers.map((m, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input placeholder="Name" value={m.name} onChange={(e) => updateModifier(i, "name", e.target.value)} className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-lg py-2 px-3 text-xs text-white" />
                                                <input type="number" step="0.01" placeholder="Price" value={m.price} onChange={(e) => updateModifier(i, "price", parseFloat(e.target.value))} className="w-20 bg-[#0a0a0f] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-white" />
                                                <button type="button" onClick={() => removeModifier(i)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        {itemModifiers.length === 0 && <p className="text-xs text-gray-500 italic">No add-ons added.</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-white/5">
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-colors">Cancel</button>
                                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                                    {formLoading ? <Loader2 className="animate-spin" size={20} /> : "Save Menu Item"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
