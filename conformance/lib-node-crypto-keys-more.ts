// node:crypto, beyond Go's standard library: encrypted private keys, the
// rsa-pss / dsa / dh / ed448 / x448 key types, secp256k1, and SPKAC
// Certificates. Keys and expected values from Node 26.13.
import * as crypto from 'node:crypto';

const encPkcs8 = "-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFNTBfBgkqhkiG9w0BBQ0wUjAxBgkqhkiG9w0BBQwwJAQQQRXhH0yUBAtFebzk\n7SuamgICCAAwDAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEEM9K9/E6ZJS4Uykj\n669n/EgEggTQuoahHHJ/DxaxcBFnU6Smvq1kq/qAqqNmcsVYP/7X2fKeF2PBziW7\nv5fErcAALdnDFqESL/wWNilTW2EFBNTPdn7B3LOF2oMaugL03T08+f8TJgCIiIns\nzyxHyEjJUfLBpopMUGgcH5+BTnEgiWJ4G2TVbd3Cg4s/xMVu3O1Z0VcPsPKtlu29\nf1oGUSBKJau+zpm+5FArOof9sTQ1Yz1lWphxGA09rpZeiqlqBDIYwydAF8H/mIQU\nGP1xnew52R0Gl3VbXVJL4aONXuq/eG+o7DUxS4nhfMIi4Vb59s/CgutBL3NgyQ8y\nMGcSOhd9QQT6VWzgLQKztJa9i2Y44PbAs/dOpD7cZt/ZY3OwhDtjYWxiXDd48pNz\nxFpFfJAatSO88Cs2deQqB2/Kt6mxL61f0Nt9L9aaAtf9T0bS8m26Euou50/VBmQs\n98H4YdubYNuasFEFLCBXrex2M+xhzorBAduPurU3p1yKtVDKTXc7jjuTaonlQ2mw\nR23YGVw0XvK3yyFObo2i4aNBpUSR78Knxp46ffRt+VlFPRzbg2/lSmcuYFNUt2yB\n1SvaR4dZzUUTwefuCX5hSrPc2N4yH6i2NLnEK1ThsS5sfQuAhEgyMlNuWKOGeeq0\nxYEOL79c0brv48Yk9il2qdJWaV4z97nEerr1HX8zslxECQQ0QURWQSpUnrK4NK3n\nEYf1xugbd1lhHe501l+kq1BmvqSEZZpztwJq5fUxMZdHLuyVVoEDYJ3pMa6uPcr/\ncOibh6Ru/Tb5idUO4oSThgXoIyjHA9gan/V31e/tgjBiqNb8hi1M2xR8/ttNWf+t\nxV10l+gMdTUg7gz/6y3oqeigIIAPImY0SQJctAvPgPlJF1fqAvDkn+EW5RP3ma0x\nPeg/6q51tMAZDj8BZZciAHbScrfg4rayCP50hNAafQi/+tFX48u7hINJpPHJOrRD\nQLIH0Hzei83jxXIvQlQndM4bhrsjUUXv4zO0gy2/AQARWMNyVmI+uVHt2o/eYFLc\nfCUeNOm9zzVyT8q2eaV4iIrmwqTfKlsrdKY7b0oSfoRwAYQh3C7Raa2yUhvKPv51\nqNiREMtqe+s+8tonpXH2nfMitTGFEYXspR4Ehd0t3TlAs+Tjm/UjtFmPQuzEI3XI\na/BmekPw8tAaF9Ek6pnxE5whBsPytvagKAwGgu0BF+/FAj/WORfPlBqOxAwsyrN4\nAxXKYgl7WfqO/bbivWCNyLoAH8wsuv9v7ejJ37msFGqPmM58ISx+5DIVjs2jgc6Y\nCZp/y5dEIOoT6csGkHEJphxzV+pnxJ3jt1Vx1bWe0myq0G5B0tKCO7a71Hhqc6yg\nOS2yr5CfQNjzNg3x4gaP7Ojxq90pcGMIqNb0TCDv+TslDTUfIE7bScZ+B+DdECtx\nj/dWAHcaWlbDnHzDVof/pGHHX0+244nFxJPd7TZ7nrNZgD9Mqr8CeDqZRMU3085w\n2t7l6I0g1mmXubH6B+21e4aEsDRZguB3pJnDr1OR7Ig2wP9IJRZwwKMD39pEvXcJ\nNVd9SLi/7ieWnZ1TbU5KggKRAfzkdJPcfFG+99HSCFRFHERsL3G13CErhhSLSNPt\n1jqqSSKeuwzjn14mtRWZeXggrcTWrzXMGZDZQv0azXjJvmdrXHHTDQs=\n-----END ENCRYPTED PRIVATE KEY-----\n";
const encTraditional = "-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,C85B78789C4A6D6A3CED665A8E0B0BF1\n\nihNpgapVJwVTCnzs9ETim7zaumZcn/VGM3yFZMIvLBxpniSjw9Z+bpt6fssasHrA\nHVdba5pkclKc+yaUm+/oFdjWJs4EARjhdWNzzCMMEhiGoTyhGKzxaUqp6lJA+RoL\nQCGAHnI21HPNl8K9ZjqpRBLr3PznA4HgQ24Mavoqrix8/dl90XJFJzw5fVdOWrf+\nIqBl2/Ue0xfVwNRH6rfYn00mT8tI03CMJ2ePiMNqd6pDIgNS1B0HlQm4jFsq/Yeq\nfg7FuRSIJA0EwxTL9A8d70mtBV2DQsVqlFI6gqPb5vjP6Ncy8fQ6Wbva/+BbBnpJ\nI4M2d4MexaK8ThCAWu+JZULBeEi7HSBRxZlkVdMJ0YDMvRa1AcICwoTiqtAfqsE/\n19FLyX5xfh+sSVOFOyeM5mvASQQqQw+ULi5sQ725aMUyBvw1Bov+Zyf+gkR5ecDk\ns382Sm6pQyJtT2cjwrXKmnvxuUm+fg6K1xDJUQn04csHHuOjw+oF69iYdetsdRFb\n00+KTFxyptFzpUKxEXd498sy31amAZMVsXDKxCnVYguK4CfDZLa6W1+UzizoYqIA\nKpAXKnYAxoJClFjNz5H87jDgmCpKWehYNJWQWsq9VcPk2x4m7YlKuL70IEUc9g6p\n2SkmeUAM2VZh9gskPUh0zgW5S1YW7OFyTeFlbleRhKN634GnzqANoWFLSfl/IzNp\ndB6KZ/TEW8JwyfWvOLjy6OszVwXOQiitpAshp8n5qprIgQhoD2QESesqhybS6nZY\ndKz/1UuM5Ucu8lq2d0nvBZiknNVZkxc2IHdfg5TF/UWIrrR9ny8sJbEVxo82WEhq\njSWTm/X3NVzs1r+0lG7p/N2xpSIVTW1uRxykuz7g2nMYuL/UKCkhz9WZt1Xy4gvl\n40m+TUuZrKE3kZQbvOup5MzNWPOPK9QRWSGFoDhnbm2EEd4hbpmhSENykqCsuSvZ\nPlW2nWwPNmVy3gnaWrUTXaZigVyzF8lfLnn3uhGkNYPol/V+U45uuhXWnuZyOV1m\n0XtH4oFE7EMM5bcqLnOevHkqOum3nbs10wZsv1wTto2/xkBemdg8q4xD3vUncu9M\nzghym2qz5fU2aU8i/fW7Fx6P2YDgapggdUaVELU3ZG6GxRHP8vXCeR16caqchimM\nHVDUtwXydYI8su3BB0Sx6cYqxPHZcv4JJPIPelGwXm0wNoS3+J5Xzal05/tv0jCs\n6s/CPo4mL69qf5Ds7D0Z6vtmnM8fJQS5VJdnMUhYJIdJTqGsA3MT/4Cm1/AWSR05\nG/UKMFulHIs6/Q5Lrtm4G5lUPqV00AEWMjIn3SqqrNNJoR183RiJgy0g2Y/B+4c1\n5PV/ii/JeP5QWZZpsQxdZvL+E/COOzjIou7ZCvU8wxFSe6w1ueZy6OHsja8tzAHA\nUmN3fvtTLQJ+5w92nquN/fv2vonoinEMmJd0aCmiGyVGkhIzymYKD0Br4gjCWVEz\noQKBkEcBSv5m1ddAugx4roBCHFL4+sc5lEjwzZHvSsHmB4SwELr7FlloEMtAjcJj\nJ/vYTavfXtVF/SyEAXWgNOftNK8Xj6Zm92HBmJ3oQqz2P3rOjo9cI11fXavwNZHG\n-----END RSA PRIVATE KEY-----\n";
const rsaPrivate = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2bO0Zwx03pxc3\n66U5ClQcO+1VT3LOoOmo3d6ws18NcNBT4lVKB3ZwhBRydxunRhLGNOM2Xt6fXrs2\nXa3RhKWp6QzzhQqI1bxv/E4hmaaCzHHi5siqcqj5mNHM7QSRJ2zGFjiNW+njITv8\nh1hETGwWd6X0vG1myqY7ZKTAgL2JrIe4QWDnNkHvn/C8UxnN0jZQKXXAo7lpVHDM\nOGqE905yYzHZ7O/aOadn830yakcBDlNL+Si8noGh8H4oRIY9rbubL7UYsS8WtiVM\n/PLkwARBEdyqQQQJSLpe0qFzbB+yfOuI2cAVzljN/xdtRxB8MsAiUo/kebeneauF\nbs0CVptTAgMBAAECggEAD+rwQ2O1jHIdggkjSRdgIHiQLHX6wBHlYZE+ia+VFzCl\nVPR2WbfN+2JjAFvpQ07He5kIzGk5xrE257cD4DjRVcKamTMeKLNxtlnPHXpxP4+E\nTnaxwsGvgdv2TonN8LZ+dMhild8TyPhQ6ieLKaZ7dfhpuDGq4CHFoIAXKh7xqu4H\nz9GhCN5caNaS6iU3Fum6HAsPv3qOQlnGBYGh5Vhrn8aRmL/4BKZc8Mnz2KW3sRMA\npa5l7ubDYeRY5gVPmFlbbLeuSZDtqCUvYdm9EFyHqsAAc0IgeBL/LGgiEpfw79Fy\nfmaUOxN5z7SwsVR4rHKO2hr89RcCywFCiCLldTq4uQKBgQDblLI5pySa6mMuoDv9\nqFpp9ermKqxGW5cktg7Isd2wfnsO+NIlu2eGpQB6yN0YT5WfcPYtftcld18W3LFh\nbGBSol/Zq8NMyYlxxDxdKIC0L/KuI8BD1mZ1Qtlezq+COtMpnP/o7l1MQgUsrfPY\nAhQuU0QWBJsTsyyL8lezXKgdOQKBgQDUrqFnBVyaL5C1GFiu3UoXFDLi1AW96IOk\nn4XyLq3dPpeEQXC1L7+AOGZ1GdGSODYfx8344K1QuKuldcfaDLAb5vezFFNiFeT7\nveKiT3WXabVGxwf1kwt9QFsCjKbKM08imjcP0nbw32ZB89oPAQlnXMYKT8nfsfRI\nF+UL5eoI6wKBgC8QdQ70a10lBfM1dwZMcmypwBprZReDhCbjOtH7hbfRtFCmNmzN\n+Ueb0DmBGhqe3EQbcziXKkgmiOQek4p9Lzwm/4JpVWf8/o+67vFMwCFe8ZYvpYMk\nzjsuA+dVR7sTHrWZqCRmCutQb0l/U3emIms3f610eUTEr7SjUfbo0kPJAoGBAL0N\nvktlaLtmLKvNyIcoDgQV4GXhMnlthhd/9gEhnUtdqDHYOefVWdUQTYMqQDBJ51K4\nuU7R6T4n6exalhwtyx4CYYy+NKCr9bARSrQdDdpaDNmtclXJMB1WZ5AMlvaGRYHs\ns6VM4I2dB7j4mo1bzpAi16ey5TADb7HmC6RX64GhAoGBAJCF0qRkD11DmodeXsj3\ncHQr5kc1jvVkLHaCM3HtLA0LOFhr7/wXJVlBeZ2nkx5q1DCuTirk328zf69cMTm8\na1b86NdAW190OH11LxtI6uVHA+tdFKfY2Bx+VArTdS+JINlSSwzbVctJwzRHz6cl\nhSJWsrjSUju7S0wUE3yBKIQ7\n-----END PRIVATE KEY-----\n";
const pssPrivate = "-----BEGIN PRIVATE KEY-----\nMIIE7QIBADA8BgkqhkiG9w0BAQowL6APMA0GCWCGSAFlAwQCAQUAoRwwGgYJKoZI\nhvcNAQEIMA0GCWCGSAFlAwQCAQUABIIEqDCCBKQCAQACggEBANpSjwPA4NRdf3kt\nXukWSg1mKjs4OVx8NjU8cAbqoACm7vgNdQl9VTPtIUJogUlzre4gLTp3POwVZQv1\nuEGgiFKHJYzImjPXIuI04Fhj+I47zZYnum0ZzJCdlX6JNBbzSKFEQqVwdlu8kXXu\nbr+Xu/r1JRetl+y9BT4IkVsmnAJb6RJnhG/VfUDWsbRcZqQmjQ3DYF+L8JYaLExx\nsa0YLp+U/94o1i5/PzmRPq7YixJ5DN5ypZZtKLrqn0NUnIlSfcl+pqmUPfqiw2yd\nFbATaHYn3Ma+slcyG0XfoOntaInfZXI0pAmuOq+keBjEKq8gF0dlHtClVWftG4C2\nbcJyWfcCAwEAAQKCAQAAhtgcyFLRmcKARJQ5zpAx/5wpiGoiizk756Wo1xVAcq4v\n+hSR+NIHGVaoYWr9fpzHKwFpZnbVwKDfqkcpaObrTA3SqwOWHG7EaD4iUtAhD0Ac\n5+ySwDlrTRQl2B/XG4Lrs4I5a3z7u61w/UfsxQAB7dG4JlEv/UTCNGE0dTY2cOMR\nGsZvBp2LJn1JJcH6kcMJiB/8lecQIizNoIMm+SGGW6ZhQ+dUw0k7tI5EuNlE0P2+\n6jKpCMN+hPCIJlzTvHIrGT2gOB20neY307o7sRbdNrH64RT5RMn7x7pMnj6raiq1\ngxoFqcU7iwtPWWzeuSyDOBq4m00a9lv1f/z+31QBAoGBAPrey51wEjBrbhu7UirO\nwibER0hmMT++JopcL0wnRSFuRO5iqZA0CMZ7jvgymp5yK+TfjuxUNmYcI9r8ONJh\nbo2mAnEfm0tBaQKRfQ5spLTqJn8xBHcCTS/hbNw4QTmABDmS6+/MxvAg8voeDcwr\nVVNC+jdrNb8tOCdCdrWDVVZVAoGBAN7JY4HMKNq8l+E6NSwQ3BWGppZxV9TI/q/5\nLVNO48TgjbsMXxHaCPRHrxRqn6dDf917K9cSw//4vaLlFseFETxN9zoIS4vSoJeV\nsICVrBZLYqvMMtnPwS2Eua/xjbfHvXJ8u75tnssY6XG5JBv9DehVUs9jTfU7MV3+\ntxudckMbAoGBAPM43Go4hLoC/g7O7xvnt16Ef6PWyDrHrXAJbiXEEQcXdKc2arUP\nbc6ZboR982BYyuusP1IrV05qS+z9Ck4V/mxAni90+EffE+NUkM1SUeHA/i/kozKK\nvbEFOljMBZis3+u94RduDxYyq8AJMVFYVfJShmsCe2ptefq+On9C5JK9AoGBANH1\nE20ovbvfDne5RpEf1noG6wpPCQpE3hlziG7Bo1BQm+GSuCn3xIaK5Aomrg2RRHiz\ncs5/Je4fOoDAy6X+1w5xH7Q2SxQbzTLuZGfaJlLger4TdDznWVQPiHuy9u8jM3wo\n5zqAzqzy7lY5uDkUVD4H40IFgVvCjDTcLy68RAnPAoGAELpPdDXukzO46CERYMHw\nDmephcCuQAjSCCYbTh/3VUreQ1cZkFovTy/G/Z8Hog0AUzdHcL8h7eQJ+fm5Ftkb\npBums/FYqGmA0YIB8Nu/ZM+HCsgrJ6Ec3ggt/57NiRfulbop1oIFuLimwp3dsdCZ\nOyPQkkMva2VDyrItNggMpFg=\n-----END PRIVATE KEY-----\n";
const pssPublic = "-----BEGIN PUBLIC KEY-----\nMIIBUTA8BgkqhkiG9w0BAQowL6APMA0GCWCGSAFlAwQCAQUAoRwwGgYJKoZIhvcN\nAQEIMA0GCWCGSAFlAwQCAQUAA4IBDwAwggEKAoIBAQDaUo8DwODUXX95LV7pFkoN\nZio7ODlcfDY1PHAG6qAApu74DXUJfVUz7SFCaIFJc63uIC06dzzsFWUL9bhBoIhS\nhyWMyJoz1yLiNOBYY/iOO82WJ7ptGcyQnZV+iTQW80ihREKlcHZbvJF17m6/l7v6\n9SUXrZfsvQU+CJFbJpwCW+kSZ4Rv1X1A1rG0XGakJo0Nw2Bfi/CWGixMcbGtGC6f\nlP/eKNYufz85kT6u2IsSeQzecqWWbSi66p9DVJyJUn3JfqaplD36osNsnRWwE2h2\nJ9zGvrJXMhtF36Dp7WiJ32VyNKQJrjqvpHgYxCqvIBdHZR7QpVVn7RuAtm3Ccln3\nAgMBAAE=\n-----END PUBLIC KEY-----\n";
const dsaPrivate = "-----BEGIN PRIVATE KEY-----\nMIIBSgIBADCCASsGByqGSM44BAEwggEeAoGBAL8S0Gj+PM/swXrpQaqmAyzk4cSx\nWq+eA4J4T6nnmqzQirEPpHFD1g2COEtNTO9S/NzqbcDOVvBxFEyQrTAK3XMxkhzO\nbOay8uF/w+Exjm+acioPO1ezno6/p0irKFeMHlhfK+vv4c2e7I7ODuQqI1A3iAxX\nWBvHwM2svLa0O5RXAhUAiGcyfp8LYDbFx2udGTwa/1p8IJcCgYA3uEGhdGGav6vU\nq6sEGkUNAblYi6oJWsrvKrf+dTqM0ERt9JVDzN57AxLeS3C1MkCP2u9buE8DuuIY\nfZvlsqrESTstxiRA75I21CyHBJNZ1eyud3Go/+E979QbJx1A2DiFp14kefIgKusn\nMf4y/Fo5jL8WbvIie5M0FeNBR08pzwQWAhQ8NARzsDSiT8GtmIxKAmdz7IP2ag==\n-----END PRIVATE KEY-----\n";
const dsaPublic = "-----BEGIN PUBLIC KEY-----\nMIIBtjCCASsGByqGSM44BAEwggEeAoGBAL8S0Gj+PM/swXrpQaqmAyzk4cSxWq+e\nA4J4T6nnmqzQirEPpHFD1g2COEtNTO9S/NzqbcDOVvBxFEyQrTAK3XMxkhzObOay\n8uF/w+Exjm+acioPO1ezno6/p0irKFeMHlhfK+vv4c2e7I7ODuQqI1A3iAxXWBvH\nwM2svLa0O5RXAhUAiGcyfp8LYDbFx2udGTwa/1p8IJcCgYA3uEGhdGGav6vUq6sE\nGkUNAblYi6oJWsrvKrf+dTqM0ERt9JVDzN57AxLeS3C1MkCP2u9buE8DuuIYfZvl\nsqrESTstxiRA75I21CyHBJNZ1eyud3Go/+E979QbJx1A2DiFp14kefIgKusnMf4y\n/Fo5jL8WbvIie5M0FeNBR08pzwOBhAACgYA00HM81wujQVgq8WdVu5zJ2EeyIT0J\nlDvKEUHF/PYnILxvibPqJY6UKdqqrbe6veN6A1JZLO05pMnu1+xBlkqw0gCJBO66\nNlFb0xAkpxMOraY9PpSMphcbZjYErLN3GIaoDf2UK2PeEBCjWUudyFYWaHGY9u3W\nSOSJdwoGhZITCw==\n-----END PUBLIC KEY-----\n";
const dhPrivate = "-----BEGIN PRIVATE KEY-----\nMIG1AgEAMIGVBgkqhkiG9w0BAwEwgYcCgYEA///////////JD9qiIWjCNMTGYouA\n3BzRKQJOCIpnzHQCC76mOxObIlFKCHmONATd75UZs806QxswKwpt8l8UN0/hNW1t\nUcJF5IW1dmJefsb0TELppjftawv/XLb0Brft7jhr+1qJn6WunyQRfEsf5kkoZlHs\n5lOB//////////8CAQIEGAIWVHlwZU5hdGl2ZSBESCB0ZXN0IGtleQ==\n-----END PRIVATE KEY-----\n";
const dhPublic = "-----BEGIN PUBLIC KEY-----\nMIIBHzCBlQYJKoZIhvcNAQMBMIGHAoGBAP//////////yQ/aoiFowjTExmKLgNwc\n0SkCTgiKZ8x0Agu+pjsTmyJRSgh5jjQE3e+VGbPNOkMbMCsKbfJfFDdP4TVtbVHC\nReSFtXZiXn7G9ExC6aY37WsL/1y29Aa37e44a/taiZ+lrp8kEXxLH+ZJKGZR7OZT\ngf//////////AgECA4GEAAKBgAzMnIzCakNkCLwAYFRnkSelhDD8RLKnB51wzq6L\niuPJePhc9MduDIIDu3DHxrzydJeTmTI6BBYmcm2JSu+KL7vBfVWqejdOvpl+wps7\nKVCCOwh3Tv8L5d6IKuJdO4tPkkmjtrAvGtAu1BCRc9Oyrsdp5//QiLEqxB0bxua/\nsmtj\n-----END PUBLIC KEY-----\n";
const ed448Private = "-----BEGIN PRIVATE KEY-----\nMEcCAQAwBQYDK2VxBDsEOYaaXXXlhsyTsLoz0CGvMjQGn2B8rwFOiz0vvJ3045vp\nYkLrRPAE3UvYsbtLs89YDiJGbFYqOe8aeQ==\n-----END PRIVATE KEY-----\n";
const ed448Public = "-----BEGIN PUBLIC KEY-----\nMEMwBQYDK2VxAzoAbBU+sAIFCUMKnoPYrg8eAiEUXU2KBqdR3kSNhezTUzEqhCxI\nZUtOqnunwEN6kQVxeLxMPQTGzhEA\n-----END PUBLIC KEY-----\n";
const x448Private = "-----BEGIN PRIVATE KEY-----\nMEYCAQAwBQYDK2VvBDoEONi1aFNqETUQ2fI7+Gld8QYl706U9eNNw55YrwZehPiL\nYhXTmmZRud8+3CiW9GO7GDXOeFZ8PNi8\n-----END PRIVATE KEY-----\n";
const x448Public = "-----BEGIN PUBLIC KEY-----\nMEIwBQYDK2VvAzkALtB0sXWJPtDWvsCNS6KKiViZupFvKW/N06di7Om0IRgtnFUD\nTmojW5vR9K/UoeRspB5lG6WOIuk=\n-----END PUBLIC KEY-----\n";
const x448OtherPublic = "-----BEGIN PUBLIC KEY-----\nMEIwBQYDK2VvAzkAmWwIVKEUIx8TGgeWgIg7ve7Iz5iV4ZRJqwbT6EHq6saQ3Ksc\n7A1qlWSGivtTfq9Y+7/zpEpRcRw=\n-----END PUBLIC KEY-----\n";
const k1Private = "-----BEGIN PRIVATE KEY-----\nMIGEAgEAMBAGByqGSM49AgEGBSuBBAAKBG0wawIBAQQgTGJozZo+wOhdBeI6Crj9\n/kcCT4faxC18FardA9FnADShRANCAAR3kC06ApcfgfGRDfsGYoRuiyTPDTsNFGLk\nirESwMW5UsuXwRhMK7RMkMZ3Wbq0y6NBBqkwDvw1dMTmvZNLqAkq\n-----END PRIVATE KEY-----\n";
const k1Public = "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEd5AtOgKXH4HxkQ37BmKEboskzw07DRRi\n5IqxEsDFuVLLl8EYTCu0TJDGd1m6tMujQQapMA78NXTE5r2TS6gJKg==\n-----END PUBLIC KEY-----\n";
const spkac = "MIIBSjCBtDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAqgyRKmnRZhtUBgPkx5Peb/a+lK91rTPSAgIXH51cXJbYf3on4gxj+5v3EzSa0OmHQigaSEfGRtKwttcjGb1Px4Q4GCVqUyqES21bg4KCuc3hzYxWmdXmgVegl7JK3xBCp3jV7vZcvNZDY2wQVqXw7fEH/JtPj7Fp+jku3Kxo0NECAwEAARYQMDEyMzQ1Njc4OWFiY2RlZjANBgkqhkiG9w0BAQsFAAOBgQAD9FA0ZARZtHSv69ng7dxbKOJLGhI0j7s4mS+iU6G4z93zXcS5VEIfOvUyBJ3qCLiT0h+Nc2/uURqti7KIY6+xZjyxZ2t88RC0/I7FCYlkvPr9MnKL0tFNNDmHwofoQvhiSssxOFW0XWqRWioEWqOC8DKtg8lMOFKsr65rKs3btg==";

const codeOf = (f: () => void): string => {
  try {
    f();
  } catch (e) {
    return (e as NodeJS.ErrnoException).code ?? '';
  }
  return '';
};
const pem = (k: crypto.KeyObject, type: 'pkcs8' | 'spki') => k.export({ format: 'pem', type }) as string;
const jwkOf = (k: crypto.KeyObject) => k.export({ format: 'jwk' }) as crypto.JsonWebKey;

// --- encrypted private keys (PBES2 and the legacy DEK-Info headers) ---
assert(codeOf(() => crypto.createPrivateKey({ key: encPkcs8, format: 'pem' })) === 'ERR_OSSL_CRYPTO_INTERRUPTED_OR_CANCELLED', 'a passphrase is needed');
assert(codeOf(() => crypto.createPrivateKey({ key: encPkcs8, format: 'pem', passphrase: 'wrong' })) === 'ERR_OSSL_BAD_DECRYPT', 'a wrong passphrase');
const decrypted = crypto.createPrivateKey({ key: encPkcs8, format: 'pem', passphrase: 'secret' });
assert(decrypted.asymmetricKeyType === 'rsa' && pem(decrypted, 'pkcs8') === rsaPrivate, 'encrypted PKCS#8');
const traditional = crypto.createPrivateKey({ key: encTraditional, format: 'pem', passphrase: 'hunter2' });
assert(traditional.equals(crypto.createPrivateKey(rsaPrivate)), 'a legacy encrypted PEM');
const reencrypted = decrypted.export({ format: 'pem', type: 'pkcs8', cipher: 'aes-128-cbc', passphrase: 'pw' });
assert(reencrypted.startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----'), 'encrypted export');
const roundTrip = crypto.createPrivateKey({ key: reencrypted, format: 'pem', passphrase: 'pw' });
assert(roundTrip.equals(decrypted), 'encrypted export round-trips');
const derEncrypted = decrypted.export({ format: 'der', type: 'pkcs8', cipher: 'aes-256-cbc', passphrase: 'pw' }) as Buffer;
assert(crypto.createPrivateKey({ key: derEncrypted, format: 'der', passphrase: 'pw' }).equals(decrypted), 'encrypted DER');
assert(codeOf(() => decrypted.export({ format: 'pem', type: 'pkcs8', cipher: 'no-such-cipher', passphrase: 'x' })) === 'ERR_CRYPTO_UNKNOWN_CIPHER', 'unknown cipher');
console.log('encrypted keys');

// --- RSA-PSS ---
const pss = crypto.createPrivateKey(pssPrivate);
const pssPub = crypto.createPublicKey(pssPublic);
assert(pss.asymmetricKeyType === 'rsa-pss', 'rsa-pss type');
const pssDetails = pss.asymmetricKeyDetails!;
assert(pssDetails.modulusLength === 2048 && pssDetails.hashAlgorithm === 'sha256' && pssDetails.mgf1HashAlgorithm === 'sha256' && pssDetails.saltLength === 20, 'rsa-pss details');
const pssSig = crypto.sign('sha256', Buffer.from('abc'), pss);
assert(crypto.verify('sha256', Buffer.from('abc'), pssPub, pssSig), 'rsa-pss sign / verify');
assert(pem(pss, 'pkcs8') === pssPrivate && pem(pssPub, 'spki') === pssPublic, 'rsa-pss round-trips');
const pssGenerated = crypto.generateKeyPairSync('rsa-pss', { modulusLength: 1024, hashAlgorithm: 'sha256', mgf1HashAlgorithm: 'sha256', saltLength: 16 });
assert(pssGenerated.privateKey.asymmetricKeyType === 'rsa-pss' && pssGenerated.privateKey.asymmetricKeyDetails!.saltLength === 16, 'generateKeyPair rsa-pss');
assert(crypto.verify('sha256', Buffer.from('x'), pssGenerated.publicKey, crypto.sign('sha256', Buffer.from('x'), pssGenerated.privateKey)), 'generated rsa-pss signs');
console.log('rsa-pss');

// --- dsa / dh ---
const dsa = crypto.createPrivateKey(dsaPrivate);
assert(dsa.asymmetricKeyType === 'dsa', 'dsa type');
const dsaDetails = dsa.asymmetricKeyDetails!;
assert(dsaDetails.modulusLength === 1024 && dsaDetails.divisorLength === 160, 'dsa details');
assert(pem(crypto.createPublicKey(dsa), 'spki') === dsaPublic, 'dsa public key');
assert(pem(crypto.createPrivateKey(pem(dsa, 'pkcs8')), 'pkcs8') === pem(dsa, 'pkcs8'), 'dsa round-trips');
const dsaSig = crypto.sign('sha256', Buffer.from('abc'), dsa);
assert(crypto.verify('sha256', Buffer.from('abc'), crypto.createPublicKey(dsa), dsaSig), 'dsa sign / verify');
const dsaP1363 = crypto.sign('sha256', Buffer.from('abc'), { key: dsa, dsaEncoding: 'ieee-p1363' });
assert(dsaP1363.length === 40, 'dsa ieee-p1363');
assert(crypto.verify('sha256', Buffer.from('abc'), { key: crypto.createPublicKey(dsa), dsaEncoding: 'ieee-p1363' }, dsaP1363), 'dsa verify p1363');
const dh = crypto.createPrivateKey(dhPrivate);
assert(dh.asymmetricKeyType === 'dh', 'dh type');
assert(pem(crypto.createPublicKey(dh), 'spki') === dhPublic, 'dh public key');
assert(pem(crypto.createPrivateKey(pem(dh, 'pkcs8')), 'pkcs8') === pem(dh, 'pkcs8'), 'dh round-trips');
assert(codeOf(() => dsa.export({ format: 'jwk' })) === 'ERR_CRYPTO_JWK_UNSUPPORTED_KEY_TYPE', 'dsa has no JWK');
console.log('dsa / dh');

// --- ed448 / x448 ---
const ed = crypto.createPrivateKey(ed448Private);
assert(ed.asymmetricKeyType === 'ed448', 'ed448 type');
assert(ed.export({ format: 'jwk' }) && pem(ed, 'pkcs8') === ed448Private, 'ed448 PKCS#8');
const edJwk = jwkOf(ed);
assert(edJwk.kty === 'OKP' && edJwk.crv === 'Ed448' && edJwk.x === 'bBU-sAIFCUMKnoPYrg8eAiEUXU2KBqdR3kSNhezTUzEqhCxIZUtOqnunwEN6kQVxeLxMPQTGzhEA' && edJwk.d === 'hppddeWGzJOwujPQIa8yNAafYHyvAU6LPS-8nfTjm-liQutE8ATdS9ixu0uzz1gOIkZsVio57xp5', 'ed448 JWK');
const edSig = crypto.sign(null, Buffer.from('abc'), ed);
assert(edSig.toString('hex') === 'f96794a202fc7b79c5aa826cc46d6b8c2c066de345586ad7342d7c4163a3bc71661567d3fe71fbe2c9bdce4ac811d2badc6be95d18276d29808c91a8679c21d65771e9669457c25e1f855e4c39138c50369fc6ce967b172afbc3915f454033168447d71f4bdd8cc456f4bf38a50baacd2c00', 'ed448 signature');
assert(crypto.verify(null, Buffer.from('abc'), crypto.createPublicKey(ed448Public), edSig), 'ed448 verify');
const edGenerated = crypto.generateKeyPairSync('ed448');
assert(edGenerated.privateKey.asymmetricKeyType === 'ed448' && crypto.verify(null, Buffer.from('y'), edGenerated.publicKey, crypto.sign(null, Buffer.from('y'), edGenerated.privateKey)), 'generateKeyPair ed448');
const x = crypto.createPrivateKey(x448Private);
assert(x.asymmetricKeyType === 'x448', 'x448 type');
assert(pem(x, 'pkcs8') === x448Private && pem(crypto.createPublicKey(x448Public), 'spki') === x448Public, 'x448 round-trips');
const xJwk = jwkOf(x);
assert(xJwk.kty === 'OKP' && xJwk.crv === 'X448' && typeof xJwk.x === 'string' && xJwk.x.length === 75, 'x448 JWK');
const shared = crypto.diffieHellman({ privateKey: x, publicKey: crypto.createPublicKey(x448OtherPublic) });
assert(shared.toString('hex') === '5ef6321a1cb92d3c58087c8a160277e5e7365f9e0eea39fc34d3f0edaddf5b94fb4f6ba1ac7255a1927caaa906ad67f4c10381d99270d432', 'x448 shared secret');
const xGenerated = crypto.generateKeyPairSync('x448');
assert(xGenerated.privateKey.asymmetricKeyType === 'x448' && crypto.diffieHellman({ privateKey: xGenerated.privateKey, publicKey: crypto.createPublicKey(x448Public) }).length === 56, 'generateKeyPair x448');
assert(codeOf(() => crypto.diffieHellman({ privateKey: ed, publicKey: crypto.createPublicKey(ed448Public) })) === 'ERR_CRYPTO_INCOMPATIBLE_KEY', 'ed448 has no ECDH');
console.log('ed448 / x448');

// --- secp256k1 (an EC key to Node) ---
const k1 = crypto.createPrivateKey(k1Private);
assert(k1.asymmetricKeyType === 'ec' && k1.asymmetricKeyDetails!.namedCurve === 'secp256k1', 'secp256k1 details');
const k1Jwk = jwkOf(k1);
assert(k1Jwk.kty === 'EC' && k1Jwk.crv === 'secp256k1' && typeof k1Jwk.x === 'string' && typeof k1Jwk.d === 'string', 'secp256k1 JWK');
const k1Sig = crypto.sign('sha256', Buffer.from('abc'), k1);
assert(crypto.verify('sha256', Buffer.from('abc'), crypto.createPublicKey(k1Public), k1Sig), 'secp256k1 sign / verify');
assert(pem(k1, 'pkcs8') === k1Private && pem(crypto.createPublicKey(k1Public), 'spki') === k1Public, 'secp256k1 round-trips');
const k1Keys = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
assert(k1Keys.privateKey.asymmetricKeyDetails!.namedCurve === 'secp256k1' && crypto.verify('sha256', Buffer.from('z'), k1Keys.publicKey, crypto.sign('sha256', Buffer.from('z'), k1Keys.privateKey)), 'generateKeyPair secp256k1');
const other = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
assert(crypto.diffieHellman({ privateKey: k1, publicKey: other.publicKey }).length === 32, 'secp256k1 diffieHellman');
assert(crypto.getCurves().includes('secp256k1'), 'getCurves');
const ecdhA = crypto.createECDH('secp256k1');
const ecdhB = crypto.createECDH('secp256k1');
const publicA = ecdhA.generateKeys('hex', 'compressed');
ecdhB.generateKeys();
assert(ecdhA.computeSecret(ecdhB.getPublicKey()).equals(ecdhB.computeSecret(ecdhA.getPublicKey())), 'createECDH secp256k1');
assert(publicA.length === 66 && ecdhA.getPrivateKey('hex').length === 64, 'secp256k1 key encodings');
assert(codeOf(() => crypto.createECDH('secp256k2')) === 'ERR_CRYPTO_INVALID_CURVE', 'unknown curve');
console.log('secp256k1');

// --- Certificate (SPKAC) ---
assert(crypto.Certificate.verifySpkac(spkac), 'verifySpkac');
assert(crypto.Certificate.exportChallenge(spkac).toString() === '0123456789abcdef', 'exportChallenge');
assert(crypto.Certificate.exportPublicKey(spkac).toString() === "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCqDJEqadFmG1QGA+THk95v9r6U\nr3WtM9ICAhcfnVxclth/eifiDGP7m/cTNJrQ6YdCKBpIR8ZG0rC21yMZvU/HhDgY\nJWpTKoRLbVuDgoK5zeHNjFaZ1eaBV6CXskrfEEKneNXu9ly81kNjbBBWpfDt8Qf8\nm0+PsWn6OS7crGjQ0QIDAQAB\n-----END PUBLIC KEY-----\n", 'exportPublicKey');
assert(!crypto.Certificate.verifySpkac('not-a-spkac'), 'a bad SPKAC');
assert(crypto.Certificate.exportChallenge('not-a-spkac') === null, 'no challenge');
console.log('SPKAC');
