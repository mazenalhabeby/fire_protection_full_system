"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { marketplaceApi } from "@/lib/api/marketplace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Package } from "lucide-react";
import { MarketplaceSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Product, ProductCategory } from "@/types/api";

export default function MarketplacePage() {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const { isAuthenticated } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Minimum loading duration for premium feel
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          marketplaceApi.getProducts({ inStock: true }),
          marketplaceApi.getCategories(),
        ]);
        setProducts(productsData.products);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to fetch marketplace data:", err);
      } finally {
        setIsDataLoading(false);
        stopLoading();
      }
    };

    fetchData();
  }, [stopLoading]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    const matchesSearch = !search ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const showSkeleton = isDataLoading || isMinLoading;

  if (showSkeleton) {
    return (
      <div className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <MarketplaceSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <PageHeader title={t("title")} subtitle={t("subtitle")} align="center" />

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("searchProducts")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === "" ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("")}
            >
              {t("allProducts")}
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("noProducts")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
                {/* Product Image */}
                <div className="aspect-square bg-secondary relative">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="h-12 w-12" />
                    </div>
                  )}
                  {product.inventory?.stock === 0 && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Badge variant="danger">{t("outOfStock")}</Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="text-foreground font-semibold mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-primary font-bold text-lg">
                        {product.priceHbct} HBCT
                      </p>
                      {product.priceFiat && (
                        <p className="text-sm text-muted-foreground">
                          ${product.priceFiat}
                        </p>
                      )}
                    </div>
                    {(product.inventory?.stock ?? 0) > 0 && (
                      <Badge variant="success" size="sm">
                        {t("inStock")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/${locale}/marketplace/${product.id}`}>
                        {t("viewDetails")}
                      </Link>
                    </Button>
                    {isAuthenticated && (product.inventory?.stock ?? 0) > 0 && (
                      <Button variant="primary" size="sm">
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Orders Link */}
        {isAuthenticated && (
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href={`/${locale}/marketplace/orders`}>
                {t("myOrders")}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
