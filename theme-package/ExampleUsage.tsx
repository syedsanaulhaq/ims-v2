import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Example usage of IMS Theme Package
const ExampleComponent = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">IMS Theme Example</h1>
          <p className="text-gray-600 mt-2">
            Professional inventory management system theme with modern UI components
          </p>
        </div>

        {/* Cards Example */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Total Items</span>
              </CardTitle>
              <CardDescription>Current inventory count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">1,234</div>
              <Badge variant="default" className="mt-2">Active</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Items below minimum level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">23</div>
              <Badge variant="destructive" className="mt-2">Alert</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Value</CardTitle>
              <CardDescription>Total inventory value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">$45,678</div>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-600">Healthy</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Form Example */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Item</CardTitle>
            <CardDescription>Create a new inventory item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemName">Item Name</Label>
                <Input id="itemName" placeholder="Enter item name" />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" placeholder="0" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button className="bg-teal-600 hover:bg-teal-700">Save Item</Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </CardContent>
        </Card>

        {/* Table Example */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>Current stock levels</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Laptop Computer</TableCell>
                  <TableCell>Electronics</TableCell>
                  <TableCell>25</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-600">In Stock</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Office Chair</TableCell>
                  <TableCell>Furniture</TableCell>
                  <TableCell>3</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Low Stock</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ExampleComponent;