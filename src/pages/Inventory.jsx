import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Wrench, PackageCheck, UserCheck } from "lucide-react";
import RawMaterialsTab from "../components/inventory/RawMaterialsTab";
import EquipmentTab from "../components/inventory/EquipmentTab";
import FinishedGoodsTab from "../components/inventory/FinishedGoodsTab";
import IssuedItemsTab from "../components/inventory/IssuedItemsTab";

export default function InventoryPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Inventory Management</h1>
      <Tabs defaultValue="raw_materials" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="raw_materials">
            <Package className="w-4 h-4 mr-2" />
            Raw Materials
          </TabsTrigger>
          <TabsTrigger value="equipment">
            <Wrench className="w-4 h-4 mr-2" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="finished_goods">
            <PackageCheck className="w-4 h-4 mr-2" />
            Finished Goods
          </TabsTrigger>
          <TabsTrigger value="issued_items">
            <UserCheck className="w-4 h-4 mr-2" />
            Issued Items
          </TabsTrigger>
        </TabsList>
        <TabsContent value="raw_materials">
          <RawMaterialsTab />
        </TabsContent>
        <TabsContent value="equipment">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="finished_goods">
          <FinishedGoodsTab />
        </TabsContent>
        <TabsContent value="issued_items">
          <IssuedItemsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}