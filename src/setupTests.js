// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

/*
# 1. Eski docs klasörünü temizle
rm -rf docs

# 2. Yeni üretim derlemesini oluştur
npm run build

# 3. build içeriğini docs klasörüne kopyala
cp -r build docs

# 4. Jekyll’in yoksaymaması için .nojekyll bırak
touch docs/.nojekyll

# 5. Değişiklikleri git’e al
git add docs docs/.nojekyll

# 6. Commit mesajı yaz
git commit -m "Deploy via docs folder: güncel build"

# 7. Main branch’e push et
git push origin main


rm -rf docs
npm run build
cp -r build docs
touch docs/.nojekyll
git add docs docs/.nojekyll
git commit -m "Deploy via docs folder: güncel build"
git push origin main

rm -rf docs
npm run build
cp -r build docs
echo "boxer.lumus.games" > docs/CNAME
touch docs/.nojekyll
git add docs docs/.nojekyll docs/CNAME
git commit -m "Deploy via docs folder: güncel build"
git push origin main

*/