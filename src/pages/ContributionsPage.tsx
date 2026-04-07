import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Plus, Filter, Download, Trash2, Edit2, CheckSquare, Square, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useContributions } from '../hooks/useContributions';
import { formatCurrency, cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export function ContributionsPage() {
  const { profile } = useAuth();
  const { contributions, loading } = useContributions();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  // Confirmation Modal
  const [showConfirmDelete, setShowConfirmDelete] = useState<{ id?: number, bulk?: boolean } | null>(null);

  const isAdmin = profile?.role === 'admin';

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isAdmin) return;
    
    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('contributions')
          .update({
            amount: parseFloat(amount),
            description,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contributions')
          .insert([
            {
              user_id: profile.id,
              amount: parseFloat(amount),
              description,
              date: new Date().toISOString(),
            }
          ]);
        if (error) throw error;
      }
      
      closeModal();
    } catch (error) {
      console.error('Error saving contribution:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setAmount('');
    setDescription('');
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setAmount(c.amount.toString());
    setDescription(c.description || '');
    setShowAddModal(true);
  };

  const handleDelete = async () => {
    if (!isAdmin || !showConfirmDelete) return;
    
    try {
      if (showConfirmDelete.bulk) {
        const { error } = await supabase
          .from('contributions')
          .delete()
          .in('id', selectedIds);
        if (error) throw error;
        setSelectedIds([]);
        setIsBulkMode(false);
      } else if (showConfirmDelete.id) {
        const { error } = await supabase
          .from('contributions')
          .delete()
          .eq('id', showConfirmDelete.id);
        if (error) throw error;
      }
      setShowConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting contribution:', error);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: number) => {
    if (!isAdmin) return;
    setIsBulkMode(true);
    toggleSelect(id);
  };

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Savings Ledger</h1>
          <p className="text-slate-500 font-medium mt-1">Track and manage family contributions</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isBulkMode ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => setShowConfirmDelete({ bulk: true })}
                disabled={selectedIds.length === 0}
                className="flex items-center space-x-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => {
                  setIsBulkMode(false);
                  setSelectedIds([]);
                }}
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
                <span>Add Contribution</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Member</th>
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Amount</th>
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Date</th>
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Description</th>
              {isAdmin && <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {contributions.map((c, index) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onContextMenu={(e) => { e.preventDefault(); handleLongPress(c.id); }}
                onClick={() => isBulkMode && toggleSelect(c.id)}
                className={cn(
                  "group transition-all hover:bg-blue-50/30 cursor-pointer",
                  selectedIds.includes(c.id) && "bg-blue-50"
                )}
              >
                <td className="px-8 py-5">
                  <div className="flex items-center space-x-4">
                    {isBulkMode && (
                      <div className={cn(
                        "h-5 w-5 rounded-md border-2 transition-all",
                        selectedIds.includes(c.id) 
                          ? "bg-blue-600 border-blue-600" 
                          : "border-slate-300"
                      )}>
                        {selectedIds.includes(c.id) && <CheckSquare className="h-4 w-4 text-white" />}
                      </div>
                    )}
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {c.profiles?.name?.[0] || 'M'}
                    </div>
                    <span className="font-bold text-slate-900">{c.profiles?.name || 'Unknown Member'}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-lg font-black text-slate-900">
                    {formatCurrency(c.amount)}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm font-medium text-slate-500">
                  {new Date(c.date).toLocaleDateString()}
                </td>
                <td className="px-8 py-5 text-sm text-slate-500 italic">
                  {c.description || 'Monthly contribution'}
                </td>
                <td className="px-8 py-5 text-right">
                  {isAdmin && !isBulkMode && (
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                        className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-all hover:bg-blue-600 hover:text-white"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowConfirmDelete({ id: c.id }); }}
                        className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-all hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {contributions.map((c, index) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            onContextMenu={(e) => { e.preventDefault(); handleLongPress(c.id); }}
            onClick={() => isBulkMode && toggleSelect(c.id)}
            className={cn(
              "relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm border border-slate-100 transition-all active:scale-95",
              selectedIds.includes(c.id) && "border-blue-500 bg-blue-50/50"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isBulkMode && (
                  <div className={cn(
                    "h-5 w-5 rounded-md border-2 transition-all",
                    selectedIds.includes(c.id) 
                      ? "bg-blue-600 border-blue-600" 
                      : "border-slate-300"
                  )}>
                    {selectedIds.includes(c.id) && <CheckSquare className="h-4 w-4 text-white" />}
                  </div>
                )}
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                  {c.profiles?.name?.[0] || 'M'}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{c.profiles?.name || 'Unknown Member'}</p>
                  <p className="text-xs text-slate-400">{new Date(c.date).toLocaleDateString()}</p>
                </div>
              </div>
              <span className="text-lg font-black text-slate-900">
                {formatCurrency(c.amount)}
              </span>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500 italic line-clamp-1">
                {c.description || 'Monthly contribution'}
              </p>
              
              {isAdmin && !isBulkMode && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                    className="rounded-xl bg-slate-50 p-2 text-slate-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete({ id: c.id }); }}
                    className="rounded-xl bg-slate-50 p-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Edit' : 'Add'} Contribution</h2>
            <form onSubmit={handleAddOrUpdate} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (KES)</label>
                <input
                  type="number"
                  required
                  placeholder="5000"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  placeholder="April contribution"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">Confirm Deletion</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete {showConfirmDelete.bulk ? `${selectedIds.length} items` : 'this contribution'}? This action cannot be undone.
            </p>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
