FROM ubuntu:22.04

# Install system deps
RUN apt-get update && \
    apt-get install -y curl perl wget make ghostscript && \
    apt-get clean

# Install TinyTeX (small LaTeX engine)
RUN curl -L https://yihui.org/tinytex/install-unx.sh -o install.sh && \
    chmod +x install.sh && \
    ./install.sh && \
    /root/.TinyTeX/bin/*/tlmgr path add

ENV PATH="/root/.TinyTeX/bin/x86_64-linux:$PATH"

# Install needed LaTeX packages
RUN tlmgr install \
    latex-bin \
    latex \
    graphics \
    tools \
    geometry \
    xcolor \
    hyperref

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 10000
CMD ["npm", "start"]
