"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Product {
  stacklineSku: string;
  title: string;
  categoryName: string;
  subCategoryName: string;
  imageUrls: string[];
}

const LIMIT = 20;

export default function Home() {
  const router = useRouter();
  const params = useSearchParams();


  const [total, setTotal] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(params.get("category") || undefined);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>(params.get("subCategory") || undefined);
  const [loading, setLoading] = useState(true);

  const offset = Number(params.get("offset") ?? 0);

  function pushQuery(next: Record<string, string | undefined>) {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v !== undefined && v !== "") qs.set(k, v);
      else qs.delete(k);
    }
    // reset paging when filters change
    if ("search" in next || "category" in next || "subCategory" in next) qs.set("offset", "0");
    // always keep limit
    qs.set("limit", String(LIMIT));
    router.push(`/?${qs.toString()}`, { scroll: false });
  }

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []));
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      setSelectedSubCategory(undefined);
      return;
    }
    fetch(`/api/subcategories?category=${encodeURIComponent(selectedCategory)}`)
      .then(r => r.json())
      .then(d => setSubCategories(d.subCategories ?? []));
  }, [selectedCategory]);


  useEffect(() => {
    const id = setTimeout(() =>
      pushQuery({ search }), 300);
    return () => clearTimeout(id);
  }, [search]); // eslint-disable-line

  // Category change: set state, clear subcat, and push both in one go
  function onCategoryChange(v: string | undefined) {
    setSelectedCategory(v);
    setSelectedSubCategory(undefined); // drop subcat when category changes
    pushQuery({ category: v, subCategory: undefined });
    if (!v) setSubCategories([]);     // instant UI clear
  }

  // Subcategory change: just set & push
  function onSubCategoryChange(v: string | undefined) {
    setSelectedSubCategory(v);
    pushQuery({ subCategory: v });
  }


  // fetch products whenever URL params change
  const productsUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (params.get("search")) qs.set("search", params.get("search")!);
    if (params.get("category")) qs.set("category", params.get("category")!);
    if (params.get("subCategory")) qs.set("subCategory", params.get("subCategory")!);
    qs.set("limit", String(LIMIT));
    qs.set("offset", String(offset));
    return `/api/products?${qs.toString()}`;
  }, [params, offset]);

  useEffect(() => {
    setLoading(true);
    fetch(productsUrl)
      .then(r => r.json())
      .then(d => {
        setProducts(d.products ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [productsUrl]);


  function nextPage() {
    pushQuery({ offset: String(offset + LIMIT) });
  }
  function prevPage() {
    pushQuery({ offset: String(Math.max(0, offset - LIMIT)) });
  }

  function clearAll() {
    setSearch("");
    setSelectedCategory("");
    setSelectedSubCategory("");
    router.push(`/?limit=${LIMIT}&offset=0`, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold mb-6">StackShop</h1>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={onCategoryChange}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCategory && subCategories.length > 0 && (
              <Select
                key={selectedCategory}
                value={selectedSubCategory}
                onValueChange={onSubCategoryChange}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  {subCategories.map((subCat) => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(search || selectedCategory || selectedSubCategory) && (
              <Button
                variant="outline"
                onClick={clearAll}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {products.length} products
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.stacklineSku}
                  href={{
                    pathname: "/product",
                    query: { product: JSON.stringify(product) },
                  }}
                >
                  <Card className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="p-0">
                      <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-muted">
                        {product.imageUrls?.[0] ? (
                          <Image
                            src={product.imageUrls[0]}
                            alt={product.title}
                            fill
                            className="object-contain p-4"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1">
                      <CardTitle className="text-base line-clamp-2 mb-2">
                        {product.title}
                      </CardTitle>
                      <CardDescription className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{product.categoryName}</Badge>
                        <Badge variant="outline">{product.subCategoryName}</Badge>
                      </CardDescription>
                    </CardContent>
                    <CardFooter className="mt-auto pt-0">
                      <Button variant="outline" className="w-full">View Details</Button>
                    </CardFooter>
                  </Card>

                </Link>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="outline" onClick={prevPage} disabled={offset <= 0}>Prev</Button>
              <span className="text-sm text-muted-foreground">
                Page {Math.floor(offset / LIMIT) + 1} / {Math.max(1, Math.ceil(total / LIMIT))}
              </span>
              <Button variant="outline" onClick={nextPage} disabled={offset + LIMIT >= total}>Next</Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
