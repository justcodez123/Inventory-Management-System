import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/AddMore.css';

interface AddMoreModalProps {
  existingProducts: string[];
  onAdd: (product: string) => void;
  onClose: () => void;
}

export const AddMoreModal: React.FC<AddMoreModalProps> = ({ existingProducts, onAdd, onClose }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSave = () => {
        const trimmed = inputValue.trim();
        if (trimmed) {
            onAdd(trimmed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') onClose();
    };

    return createPortal(
        <div className="add-more-modal-overlay" onClick={onClose}>
            <div className="add-more-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="add-more-modal-header">
                    <h2>Add New Product</h2>
                    <input 
                        type="text" 
                        className="add-more-modal-input" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                    
                    <div className="add-more-existing-section">
                        <p className="add-more-existing-title">Existing Products:</p>
                        <div className="add-more-existing-list">
                            {existingProducts.map(prod => (
                                <span key={prod} className="add-more-existing-pill">
                                    {prod}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="add-more-modal-actions">
                         <button className="add-more-modal-btn cancel-btn" onClick={onClose}>
                            Cancel
                         </button>
                         <button className="add-more-modal-btn save-btn" onClick={handleSave}>
                            Save & Select
                         </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
