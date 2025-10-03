// --- START OF FILE pages/RecipeManagement.jsx ---

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import StatCard from '../components/StatsCard';
import axios from 'axios';

// CreateRecipeModal component has been updated
const CreateRecipeModal = ({ onClose, onSave, availableIngredients }) => {
    const [recipeIngredients, setRecipeIngredients] = useState([]);
    const [formData, setFormData] = useState({ recipe_name: '', selling_price: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // Adds an ingredient to the recipe list with a default quantity of 1
    const addIngredient = (ingredient) => {
        if (recipeIngredients.some(item => item.id === ingredient.id)) return; // Avoid duplicates
        setRecipeIngredients(prev => [...prev, { ...ingredient, quantity: 1 }]);
    };

    // Updates the quantity for a specific ingredient in the recipe
    const handleQuantityChange = (id, newQuantity) => {
        const quantity = Math.max(0, parseFloat(newQuantity) || 0);
        setRecipeIngredients(prev =>
            prev.map(item => (item.id === id ? { ...item, quantity } : item))
        );
    };

    const removeIngredient = (id) => setRecipeIngredients(prev => prev.filter(item => item.id !== id));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const payload = {
            ...formData,
            selling_price: Number(formData.selling_price) || 0,
            // Filter out ingredients with 0 quantity before submitting
            ingredients: recipeIngredients
                .filter(ing => ing.quantity > 0)
                .map(ing => ({ id: ing.id, quantity: ing.quantity })),
        };
        try {
            await axios.post('/api/recipes', payload);
            alert('Recipe Created!');
            onSave();
            onClose();
        } catch (err) {
            let errorMessage = 'An unexpected error occurred.';
            if (err.response?.data?.errors) {
                errorMessage = Object.values(err.response.data.errors).flat().join(' \n');
            }
            setError(errorMessage);
            alert('Error: \n' + errorMessage);
        } finally { setLoading(false); }
    };

    // Filter out ingredients that have already been added to the recipe
    const ingredientsToAdd = availableIngredients.filter(
        ing => !recipeIngredients.some(item => item.id === ing.id)
    );

    const totalCost = recipeIngredients.reduce((acc, item) => acc + (item.current_price * item.quantity), 0);
    const sellingPriceNum = Number(formData.selling_price) || 0;
    const profit = sellingPriceNum - totalCost;
    const margin = sellingPriceNum > 0 ? (profit / sellingPriceNum) * 100 : 0;

    return (
        <form onSubmit={handleSubmit}>
            <div className="recipe-modal-content">
                <div>
                    <h4>Recipe Information</h4>
                    <div className="form-group"><label>Recipe Name</label><input type="text" name="recipe_name" value={formData.recipe_name} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Selling Price</label><input type="number" step="0.01" name="selling_price" value={formData.selling_price} onChange={handleChange} required /></div>
                </div>
                <div className="recipe-summary-card">
                    <h4>Recipe Summary</h4>
                    <p><span>Total Cost:</span> <span>${totalCost.toFixed(2)}</span></p>
                    <p><span>Selling Price:</span> <span>${sellingPriceNum.toFixed(2)}</span></p>
                    <p><span>Profit:</span> <span>${profit.toFixed(2)}</span></p>
                    <p><strong><span>Actual Margin:</span> <span>{margin.toFixed(1)}%</span></strong></p>
                </div>
                <div>
                    <h4>Available Ingredients</h4>
                    <div className="ingredients-list-container">
                        {ingredientsToAdd.map(ing => (
                            <div key={ing.id} className="ingredient-item">
                                <span>{ing.ingredient_name} <small>({ing.unit})</small></span>
                                <button type="button" className="btn btn-primary" onClick={() => addIngredient(ing)}>Add</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4>Recipe Ingredients</h4>
                    <div className="ingredients-list-container">
                        {recipeIngredients.length > 0 ? recipeIngredients.map(ing => (
                            <div key={ing.id} className="ingredient-item">
                                <span>{ing.ingredient_name}</span>
                                <div className="ingredient-controls">
                                    <div className="quantity-control">
                                        <button type="button" className="btn btn-secondary" onClick={() => handleQuantityChange(ing.id, ing.quantity - 0.1)}>-</button>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={ing.quantity.toFixed(2)}
                                            onChange={(e) => handleQuantityChange(ing.id, e.target.value)}
                                        />
                                        <button type="button" className="btn btn-secondary" onClick={() => handleQuantityChange(ing.id, ing.quantity + 0.1)}>+</button>
                                    </div>
                                    <button type="button" className="btn-delete" onClick={() => removeIngredient(ing.id)}>Remove</button>
                                </div>
                            </div>
                        )) : <p style={{ textAlign: 'center', padding: '20px' }}>No ingredients added yet.</p>}
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>Create Recipe</button>
            </div>
            {error && <p className="error-message" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}
        </form>
    );
};


const RecipeManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recipes, setRecipes] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [recipesRes, ingredientsRes] = await Promise.all([
                axios.get('/api/recipes'),
                axios.get('/api/ingredients')
            ]);
            setRecipes(recipesRes.data);
            setIngredients(ingredientsRes.data);
        } catch (err) {
            setError('Failed to load page data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete the recipe "${name}"?`)) {
            try {
                await axios.delete(`/api/recipes/${id}`);
                alert(`Recipe "${name}" deleted successfully.`);
                loadData();
            } catch (err) {
                console.error('Delete error:', err);
                alert('Failed to delete recipe.');
            }
        }
    };

    const avgRecipeCost = recipes.length > 0 ? (recipes.reduce((sum, r) => sum + Number(r.cost), 0) / recipes.length).toFixed(2) : '0.00';
    const avgMargin = recipes.length > 0 ? (recipes.reduce((sum, r) => sum + Number(r.margin), 0) / recipes.length).toFixed(1) : '0.0';

    return (
        <>
            <header><h1>Recipe Cost Management</h1><button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Create Recipe</button></header>
            <div className="grid-container">
                <StatCard title="Total Recipes" value={recipes.length} />
                <StatCard title="Avg Recipe Cost" value={`$${avgRecipeCost}`} />
                <StatCard title="Avg Margin" value={`${avgMargin}%`} />
            </div>
            <div className="card table-container">
                {loading && <p style={{ padding: '20px' }}>Loading...</p>}
                {error && <p className="error-message" style={{ padding: '20px' }}>{error}</p>}
                {!loading && !error && (
                    <table className="data-table">
                        <thead><tr><th>Recipe</th><th>Cost</th><th>Selling Price</th><th>Margin</th><th>Actions</th></tr></thead>
                        <tbody>
                            {recipes.map(recipe => (
                                <tr key={recipe.id}>
                                    <td>{recipe.recipe_name}</td>
                                    <td>${Number(recipe.cost).toFixed(2)}</td>
                                    <td>${Number(recipe.selling_price).toFixed(2)}</td>
                                    <td>{Number(recipe.margin).toFixed(1)}%</td>
                                    <td>
                                        <div className="actions-cell">
                                            <Link to={`/recipes/${recipe.id}`} className="btn-link">View Details</Link>
                                            <button onClick={() => handleDelete(recipe.id, recipe.recipe_name)} className="btn-delete">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Recipe">
                <CreateRecipeModal onClose={() => setIsModalOpen(false)} onSave={loadData} availableIngredients={ingredients} />
            </Modal>
        </>
    );
};
export default RecipeManagement;
