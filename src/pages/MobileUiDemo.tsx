import React from 'react'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Select } from '@/src/components/ui/select'
import { Badge } from '@/src/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card'
import { Sheet } from '@/src/components/ui/sheet'
import { Dialog } from '@/src/components/ui/dialog'
import { Plus, Filter, ChevronRight } from 'lucide-react'

const MobileUiDemo: React.FC = () => {
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-pink-700">Sandy's Pet Shop — UI Mobile</h1>
          <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)} leftIcon={<Filter size={16} />}>Filtros</Button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Agendar — Banho & Tosa</CardTitle>
              <Badge variant="secondary">Mobile</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input label="Nome do Pet" placeholder="Ex.: Thor" />
              <Input label="WhatsApp do Tutor" placeholder="(11) 9 9999-9999" />
              <Select label="Serviço" options={[
                { label: 'Só Banho', value: 'SO_BANHO' },
                { label: 'Banho & Tosa', value: 'BANHO_TOSA' },
                { label: 'Pet Móvel', value: 'PET_MOVEL' },
              ]} />
              <div className="flex gap-2">
                <Button leftIcon={<Plus size={18} />}>Agendar</Button>
                <Button variant="outline" rightIcon={<ChevronRight size={18} />}>Ver detalhes</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge>AGENDADO</Badge>
              <Badge variant="success">CONFIRMADO</Badge>
              <Badge variant="warning">PENDENTE</Badge>
              <Badge variant="destructive">CANCELADO</Badge>
            </div>
            <div className="mt-3">
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>Abrir diálogo</Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Filtros">
        <div className="space-y-3">
          <Select label="Status" options={[
            { label: 'Todos', value: 'ALL' },
            { label: 'Agendado', value: 'AGENDADO' },
            { label: 'Concluído', value: 'CONCLUIDO' },
          ]} />
          <Button variant="default" onClick={() => setSheetOpen(false)}>
            Aplicar
          </Button>
        </div>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Confirmação" description="Deseja confirmar esta ação?">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="default" onClick={() => setDialogOpen(false)}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}

export default MobileUiDemo