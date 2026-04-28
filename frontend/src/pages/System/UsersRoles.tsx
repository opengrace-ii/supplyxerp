import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, InlineAlert } from "@/components/ui/Form";
import { cn } from "@/lib/cn";

function apiFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
}

export default function UsersRoles() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "VIEWER" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Role Modal
  const [roleModal, setRoleModal] = useState<{ id: number, role: string } | null>(null);
  
  // Password Modal
  const [pwdModal, setPwdModal] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState("");

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/users");
      const d = await res.json();
      setUsers(d.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      const res = await apiFetch(`/api/users/${deleteModal}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteModal(null);
        fetchUsers();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to delete");
      }
    } catch (e) { setErrorMsg("Failed to delete user"); }
  };

  const handleRoleChange = async () => {
    if (!roleModal) return;
    try {
      const res = await apiFetch(`/api/users/${roleModal.id}/role`, { 
        method: "PUT", body: JSON.stringify({ role: roleModal.role }) 
      });
      if (res.ok) {
        setRoleModal(null);
        fetchUsers();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to change role");
      }
    } catch (e) { setErrorMsg("Failed to change role"); }
  };

  const handlePwdChange = async () => {
    if (!pwdModal || !newPwd) return;
    try {
      const res = await apiFetch(`/api/users/${pwdModal}/password`, { 
        method: "PUT", body: JSON.stringify({ new_password: newPwd }) 
      });
      if (res.ok) {
        setPwdModal(null);
        setNewPwd("");
        setErrorMsg(null);
      } else {
        setErrorMsg("Failed to update password");
      }
    } catch (e) { setErrorMsg("Failed to update password"); }
  };

  const handleCreate = async () => {
    try {
      const res = await apiFetch("/api/users", { method: "POST", body: JSON.stringify(newUser) });
      if (res.ok) {
        setShowAdd(false);
        setNewUser({ username: "", email: "", password: "", role: "VIEWER" });
        fetchUsers();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to create user");
      }
    } catch (e) { setErrorMsg("Failed to create user"); }
  };

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8 bg-[var(--bg-base)]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--accent)]">Users & Roles</h1>
          <p className="text-sm text-[var(--text-2)] mt-2">Manage system access and permissions</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>+ New User</Button>
      </div>

      {errorMsg && <InlineAlert type="error" message={errorMsg} className="mb-6" />}

      <Card>
        <CardBody>
          <DataTable
            columns={[
              { key: 'id', header: 'ID', width: '60px', className: 'opacity-40 text-xs' },
              { key: 'username', header: 'USERNAME', className: 'font-bold' },
              { key: 'email', header: 'EMAIL' },
              { 
                key: 'role', 
                header: 'ROLE',
                render: (u) => <Badge variant="blue">{u.role}</Badge>
              },
              { key: 'created_at', header: 'CREATED AT', className: 'opacity-40 text-xs' },
              { 
                key: 'actions', 
                header: '', 
                className: 'text-right',
                render: (u) => (
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setRoleModal({ id: u.id, role: u.role })}>Role</Button>
                    <Button variant="ghost" size="sm" onClick={() => setPwdModal(u.id)}>Pwd</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteModal(u.id)}>Del</Button>
                  </div>
                )
              },
            ]}
            rows={users}
            loading={loading}
          />
        </CardBody>
      </Card>

      {/* Add User Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New User" subtitle="Create a new system user">
        <div className="space-y-4">
          <Field label="Username">
            <Input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
          </Field>
          <Field label="Email">
            <Input value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
          </Field>
          <Field label="Password">
            <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
          </Field>
          <Field label="Role">
            <Select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
              <option value="ADMIN">ADMIN</option>
              <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER</option>
              <option value="OPERATOR">OPERATOR</option>
              <option value="VIEWER">VIEWER</option>
              <option value="PURCHASING">PURCHASING</option>
            </Select>
          </Field>
          <div className="flex gap-3 mt-6">
            <Button variant="primary" className="flex-1" onClick={handleCreate}>Save User</Button>
            <Button variant="ghost" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Role Modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Change Role">
        <div className="space-y-4">
          <Field label="Select New Role">
            <Select value={roleModal?.role || ""} onChange={e => setRoleModal(p => p ? {...p, role: e.target.value} : null)}>
              <option value="ADMIN">ADMIN</option>
              <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER</option>
              <option value="OPERATOR">OPERATOR</option>
              <option value="VIEWER">VIEWER</option>
              <option value="PURCHASING">PURCHASING</option>
            </Select>
          </Field>
          <div className="flex gap-3 mt-6">
            <Button variant="primary" className="flex-1" onClick={handleRoleChange}>Update Role</Button>
            <Button variant="ghost" className="flex-1" onClick={() => setRoleModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal open={!!pwdModal} onClose={() => setPwdModal(null)} title="Update Password">
        <div className="space-y-4">
          <Field label="New Password">
            <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoFocus />
          </Field>
          <div className="flex gap-3 mt-6">
            <Button variant="primary" className="flex-1" onClick={handlePwdChange}>Update Password</Button>
            <Button variant="ghost" className="flex-1" onClick={() => setPwdModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete User">
        <div className="space-y-6">
          <p className="text-sm text-[var(--text-2)]">Are you sure you want to delete this user? This action cannot be undone.</p>
          <div className="flex gap-3 mt-6">
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Yes, Delete</Button>
            <Button variant="ghost" className="flex-1" onClick={() => setDeleteModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
