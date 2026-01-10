import React from 'react';
import { Menu, MenuItem } from './components/ui/menu';

const ActionMenu: React.FC<{ 
    isOpen: boolean;
    position: { top: number; left: number };
    onClose: () => void;
    onAddObservation: () => void;
    onAddExtraServices: () => void;
}> = ({ isOpen, position, onClose, onAddObservation, onAddExtraServices }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed bg-white rounded-xl shadow-lg border border-gray-200 animate-fadeIn"
            style={{ top: position.top, left: position.left, zIndex: 9999 }}
        >
            <Menu className="p-2" ariaLabel="Menu de ações do agendamento">
                <MenuItem tone="subtle" label="Adicionar Observação" onClick={onAddObservation} />
                <MenuItem tone="subtle" label="Adicionar Serviço Extra" onClick={onAddExtraServices} />
            </Menu>
        </div>
    );
};

export default ActionMenu;