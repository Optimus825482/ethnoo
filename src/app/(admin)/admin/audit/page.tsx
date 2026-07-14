"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  ipAddress: string | null;
  createdAt: string;
  user: { fullName: string; username: string } | null;
}

const actionLabels: Record<string, string> = {
  LOGIN: "Giriş",
  LOGOUT: "Çıkış",
  CHANGE_PASSWORD: "Şifre Değişikliği",
  CREATE_USER: "Kullanıcı Oluşturma",
  UPDATE_USER: "Kullanıcı Güncelleme",
  DELETE_USER: "Kullanıcı Silme",
  CREATE_BUGGY: "Araç Oluşturma",
  UPDATE_BUGGY: "Araç Güncelleme",
  DELETE_BUGGY: "Araç Silme",
  UPDATE_BUGGY_STATUS: "Araç Durum Değişikliği",
  ASSIGN_DRIVER: "Sürücü Atama",
  UNASSIGN_DRIVER: "Sürücü Çıkarma",
  CREATE_LOCATION: "Konum Oluşturma",
  UPDATE_LOCATION: "Konum Güncelleme",
  DELETE_LOCATION: "Konum Silme",
  GENERATE_QR: "QR Oluşturma",
  ACCEPT_REQUEST: "Talep Kabul",
  COMPLETE_REQUEST: "Talep Tamamlama",
  CANCEL_REQUEST: "Talep İptal",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/audit?pageSize=100");
      const json = await res.json();
      if (json.success) setLogs(json.data.items);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Loading fullPage />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Denetim Günlüğü</h1>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <EmptyState icon={<FileText className="h-12 w-12" />} title="Kayıt yok" description="İşlemler burada görünecek" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Varlık</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Saat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Badge variant="secondary">{actionLabels[l.action] || l.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{l.entityType} #{l.entityId || "—"}</TableCell>
                    <TableCell className="text-sm">{l.user?.fullName || "Sistem"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.ipAddress || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString("tr-TR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
